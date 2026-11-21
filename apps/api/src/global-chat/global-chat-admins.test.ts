import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import {
  GLOBAL_CHAT_ADMINS_REFRESH,
  makeRefreshingGlobalChatAdmins,
} from "./global-chat-admins.js";

describe("makeRefreshingGlobalChatAdmins", () => {
  it("follows the role and keeps the last answer while the auth service is down", async () => {
    let answer: ReadonlyArray<string> | "down" = "down";

    await Effect.runPromise(
      Effect.gen(function* () {
        const admins = yield* makeRefreshingGlobalChatAdmins({
          configuredUserIds: ["configured"],
          fetchRoleHolders: Effect.suspend(() =>
            answer === "down" ? Effect.fail("down") : Effect.succeed(answer),
          ),
        });

        const afterRefresh = Effect.andThen(
          TestClock.adjust(GLOBAL_CHAT_ADMINS_REFRESH),
          Effect.sync(() => admins.ids().toSorted()),
        );

        // The auth service is down at startup: the configured list still works.
        expect(admins.ids()).toEqual(["configured"]);

        answer = ["granted"];
        expect(yield* afterRefresh).toEqual(["configured", "granted"]);

        answer = "down";
        expect(yield* afterRefresh).toEqual(["configured", "granted"]);

        // The role was removed in the panel; a configured admin never is.
        answer = [];
        expect(yield* afterRefresh).toEqual(["configured"]);
        expect(admins.has("granted")).toBe(false);
      }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
    );
  });
});
