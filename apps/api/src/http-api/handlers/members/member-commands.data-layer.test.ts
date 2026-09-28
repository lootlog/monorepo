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
import { makeMemberDelivery } from "#src/members/member-delivery.operations";
import { makeMemberStore } from "#src/members/member.store";
import {
  applicationErrorStatusOrUndefined,
  InvalidRequestError,
} from "#src/shared/http/http-errors";
import { makeMembersDataLayer } from "./member-commands.data-layer.js";
import { MembersData } from "./members.handlers.js";

test("manual deactivation delivers its revocation after cache and broker failures without republishing on retry", async () => {
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

    const delivery = makeMemberDelivery(makeMemberStore(boundary.database), {
      clearMemberCaches: () =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.void,
      publishMemberRemoved: ({ globalUserId }) =>
        failDelivery
          ? Effect.fail(new Error("broker unavailable"))
          : Effect.sync(() => {
              delivered.push(globalUserId);
            }),
      invalidateMember: () => Effect.void,
      publishMemberUpdated: () => Effect.void,
    });

    const membersLayer = makeMembersDataLayer(
      {
        refreshGuildMember: () => Effect.die("Unexpected refresh"),
        recordStaleUse: () => Effect.void,
        enqueueBulkRefresh: () => Effect.void,
        publishRefreshJobUpdate: () => Effect.void,
        deliverMemberChanges: delivery.deliverAll,
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
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual([]);
    failDelivery = false;
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual(["user-1"]);

    const retried = await boundary.run(Effect.result(deactivate));
    await boundary.run(delivery.dispatchPending());
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
