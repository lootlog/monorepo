import { expect, test } from "bun:test";
import { Schema } from "effect";
import { UserOnlineQuery } from "#src/http-api/contracts/users/schemas";

const decode = Schema.decodeUnknownSync(UserOnlineQuery);
test("online queries accept sixteen weeks and reject a longer calendar range", () => {
  expect(decode({ from: "2026-05-18", to: "2026-09-06" })).toEqual({
    from: "2026-05-18",
    to: "2026-09-06",
  });
  expect(() => decode({ from: "2026-05-17", to: "2026-09-06" })).toThrow();
});
