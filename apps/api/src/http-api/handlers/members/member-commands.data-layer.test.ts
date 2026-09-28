import { expect, test } from "bun:test";
import { Effect, Result } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { guildTable, memberTable } from "#src/database/drizzle/schema";
import { ErrorKey } from "#src/members/error-key";
import { makeMemberStore } from "#src/members/member.store";
import {
  applicationErrorStatusOrUndefined,
  InvalidRequestError,
} from "#src/shared/http/http-errors";
import { makeMembersDataLayer } from "./member-commands.data-layer.js";
import { MembersData } from "./members.handlers.js";

test("retrying manual deactivation repairs revocation delivery before returning the existing inactive-member error", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      boundary.database
        .insert(memberTable)
        .values(
          createMemberFixture({ userId: "discord-1", globalUserId: "user-1" }),
        ),
    );
    let failInvalidation = true;
    let failDelivery = false;
    const delivered: string[] = [];

    const membersLayer = makeMembersDataLayer(
      {
        refreshGuildMember: () => Effect.die("Unexpected refresh"),
        recordStaleUse: () => Effect.void,
        enqueueBulkRefresh: () => Effect.void,
        publishRefreshJobUpdate: () => Effect.void,
        clearMemberCaches: () =>
          failInvalidation
            ? Effect.fail(new Error("cache unavailable"))
            : Effect.void,
        publishMemberRemoved: ({ userId }) =>
          failDelivery
            ? Effect.fail(new Error("broker unavailable"))
            : Effect.sync(() => {
                delivered.push(userId);
              }),
      },
      RuntimeEnvironment.LOCAL,
    );

    const deactivate = Effect.gen(function* () {
      const members = yield* MembersData;

      return yield* members.deactivateMember("guild-1", "discord-1");
    }).pipe(Effect.provide(membersLayer));

    expect(await boundary.run(Effect.result(deactivate))).toMatchObject({
      failure: { cause: { message: "cache unavailable" } },
    });
    expect(delivered).toEqual([]);
    expect(
      (
        await boundary.run(
          makeMemberStore(boundary.database).findMember("discord-1", "guild-1"),
        )
      )?.active,
    ).toBe(false);
    failInvalidation = false;
    failDelivery = true;
    expect(await boundary.run(Effect.result(deactivate))).toMatchObject({
      failure: { cause: { message: "broker unavailable" } },
    });
    failDelivery = false;
    const retried = await boundary.run(Effect.result(deactivate));
    expect(delivered).toEqual(["user-1"]);
    expect(Result.isFailure(retried)).toBe(true);

    if (Result.isFailure(retried)) {
      expect(retried.failure.cause).toBeInstanceOf(InvalidRequestError);
      expect(applicationErrorStatusOrUndefined(retried.failure.cause)).toBe(
        400,
      );
      expect(retried.failure.cause).toMatchObject({
        message: ErrorKey.MEMBER_ALREADY_DEACTIVATED,
      });
    }
  } finally {
    await boundary.dispose();
  }
});
