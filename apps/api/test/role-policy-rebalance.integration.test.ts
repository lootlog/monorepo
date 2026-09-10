import { afterAll, describe, expect, it } from "bun:test";
import { Effect, ManagedRuntime } from "effect";
import { eq } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import type { GuildMemberChanged } from "@lootlog/protocol/rabbit/events";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  roleTable,
  memberTable,
  memberToRoleTable,
} from "#src/database/drizzle/schema";
import { RolesData } from "#src/http-api/handlers/organization-workspace/organization-workspace.operations";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

afterAll(() => runtime.dispose());

describe("Role policy rebalance against PostgreSQL", () => {
  it("publishes affected active members after persisted permission and level changes", async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        const guildId = crypto.randomUUID();
        const otherGuildId = crypto.randomUUID();
        const roleId = crypto.randomUUID();
        const otherRoleId = crypto.randomUUID();
        const updatedAt = new Date();
        yield* db.insert(guildTable).values(
          [guildId, otherGuildId].map((id) => ({
            id,
            name: "Test",
            ownerId: "owner",
            updatedAt,
          })),
        );
        yield* db.insert(roleTable).values([
          {
            id: roleId,
            guildId,
            name: "Role",
            permissions: [
              Permission.LOOTLOG_TIMERS_READ,
              Permission.LOOTLOG_TIMERS_TITANS_READ,
            ],
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
            updatedAt,
          },
          { id: otherRoleId, guildId, name: "Other", updatedAt },
        ]);

        const members = yield* db
          .insert(memberTable)
          .values([
            {
              userId: "affected",
              globalUserId: "internal-affected",
              guildId,
              name: "Affected",
              updatedAt,
            },
            {
              userId: "inactive",
              globalUserId: "internal-inactive",
              guildId,
              name: "Inactive",
              active: false,
              updatedAt,
            },
            { userId: "unlinked", guildId, name: "Unlinked", updatedAt },
            {
              userId: "other-role",
              globalUserId: "internal-other",
              guildId,
              name: "Other",
              updatedAt,
            },
            {
              userId: "other-org",
              globalUserId: "internal-other-org",
              guildId: otherGuildId,
              name: "Other org",
              updatedAt,
            },
          ])
          .returning();

        yield* db.insert(memberToRoleTable).values(
          members.map((member) => ({
            A: member.id,
            B: member.userId === "other-role" ? otherRoleId : roleId,
          })),
        );
        const published: Array<typeof GuildMemberChanged.Type> = [];
        let cleared = false;
        let failDelivery = false;

        const layer = RolesData.layerDatabase(
          {
            deleteByPattern: () =>
              Effect.sync(() => {
                cleared = true;
              }),
          },
          {
            memberPolicyChanged: (member) =>
              Effect.gen(function* () {
                expect(cleared).toBe(true);

                if (failDelivery)
                  return yield* Effect.fail(new Error("broker unavailable"));

                const [saved] = yield* db
                  .select()
                  .from(roleTable)
                  .where(eq(roleTable.id, roleId));

                expect(saved?.permissions).toEqual([
                  Permission.LOOTLOG_TIMERS_READ,
                ]);
                published.push(member);
              }),
          },
        );

        const update = (lvlRangeFrom: number, lvlRangeTo: number) =>
          Effect.gen(function* () {
            const roles = yield* RolesData;

            return yield* roles.updateRole("owner", guildId, roleId, {
              permissions: [Permission.LOOTLOG_TIMERS_READ],
              lvlRangeFrom,
              lvlRangeTo,
            });
          }).pipe(Effect.provide(layer));

        yield* update(0, 500);
        expect(published).toEqual([
          { guildId, discordId: "affected", userId: "internal-affected" },
        ]);
        published.length = 0;
        cleared = false;
        yield* update(200, 300);
        expect(published).toEqual([
          { guildId, discordId: "affected", userId: "internal-affected" },
        ]);
        published.length = 0;
        cleared = false;
        yield* update(200, 300);
        expect(published).toEqual([
          { guildId, discordId: "affected", userId: "internal-affected" },
        ]);
        expect(cleared).toBe(true);
        published.length = 0;
        failDelivery = true;
        const failure = yield* Effect.exit(update(210, 290));
        expect(failure._tag).toBe("Failure");
        failDelivery = false;
        yield* update(210, 290);
        expect(published).toEqual([
          { guildId, discordId: "affected", userId: "internal-affected" },
        ]);
      }),
    );
  });
});
