import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import {
  ROLE_HOLDERS_REFRESH,
  makeRefreshingRoleHolders,
} from "./role-holders.js";

describe("makeRefreshingRoleHolders", () => {
  it("follows the role and keeps the last answer while the auth service is down", async () => {
    let answer: ReadonlyArray<string> | "down" = "down";

    await Effect.runPromise(
      Effect.gen(function* () {
        const admins = yield* makeRefreshingRoleHolders({
          configuredUserIds: ["configured"],
          fetchRoleHolders: Effect.suspend(() =>
            answer === "down" ? Effect.fail("down") : Effect.succeed(answer),
          ),
        });

        const afterRefresh = Effect.andThen(
          TestClock.adjust(ROLE_HOLDERS_REFRESH),
          Effect.sync(() => admins.ids().toSorted()),
        );

        expect(admins.ids()).toEqual(["configured"]);

        answer = ["granted"];
        expect(yield* afterRefresh).toEqual(["configured", "granted"]);

        answer = "down";
        expect(yield* afterRefresh).toEqual(["configured", "granted"]);

        answer = [];
        expect(yield* afterRefresh).toEqual(["configured"]);
        expect(admins.has("granted")).toBe(false);
      }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
    );
  });
});
