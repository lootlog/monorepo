import { expect, test } from "bun:test";
import { restoreForwardAuthMiddleware } from "./restore-forward-auth-middleware.js";

test("keeps the checked-in forward-auth middleware normalized", async () => {
  const source = await Bun.file(
    new URL("./lootlog-api.generated.ts", import.meta.url),
  ).text();

  expect(restoreForwardAuthMiddleware(source)).toBe(source);
});

test("fails closed when the generated declaration changes unexpectedly", () => {
  expect(() => restoreForwardAuthMiddleware("unrecognized output")).toThrow(
    "expected one declaration",
  );
});
