import { expect, test } from "bun:test";
import { Schema } from "effect";
import { UserOnlineQuery } from "#src/http-api/contracts/users/schemas";

const decode = Schema.decodeUnknownSync(UserOnlineQuery);

test("online queries accept a year and reject a longer calendar range", () => {
  expect(decode({ from: "2025-09-07", to: "2026-09-06" })).toEqual({
    from: "2025-09-07",
    to: "2026-09-06",
  });
  expect(() => decode({ from: "2025-09-06", to: "2026-09-06" })).toThrow();
});
