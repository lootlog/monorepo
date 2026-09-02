import { and, arrayOverlaps, eq, inArray, isNotNull, or } from "drizzle-orm";
import { Effect } from "effect";
import type { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import {
  discordGuildSyncStateTable,
  guildTable,
  itemRarityEnum,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  memberTable,
  memberToRoleTable,
  npcTypeEnum,
  roleTable,
  timerTable,
  userSettingsTable,
} from "../database/drizzle/schema.js";
import { MEMBER_LAST_DISCORD_STATUS } from "../members/constants/member-discord-status.constant.js";

type GuildWrite = Partial<typeof guildTable.$inferInsert>;
export type GuildRecord = typeof guildTable.$inferSelect;

export class GuildsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findActive(idOrVanityUrl: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(guildTable)
        .where(
          and(
            eq(guildTable.active, true),
            or(
              eq(guildTable.id, idOrVanityUrl),
              eq(guildTable.vanityUrl, idOrVanityUrl),
            ),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.run((database) =>
      database.select().from(guildTable).where(eq(guildTable.id, id)).limit(1),
    );
    return rows[0] ?? null;
  }

  findByIds(ids: ReadonlyArray<string>, activeOnly = false) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(guildTable)
        .where(
          and(
            inArray(guildTable.id, [...ids]),
            activeOnly ? eq(guildTable.active, true) : undefined,
          ),
        ),
    );
  }

  findForPermissions(discordId: string, permissions: Permission[]) {
    return this.run((database) =>
      Effect.map(
        database
          .selectDistinct({ guild: guildTable })
          .from(guildTable)
          .leftJoin(
            memberTable,
            and(
              eq(memberTable.guildId, guildTable.id),
              eq(memberTable.userId, discordId),
              eq(memberTable.active, true),
              isNotNull(memberTable.globalUserId),
            ),
          )
          .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
          .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
          .where(
            and(
              eq(guildTable.active, true),
              or(
                eq(guildTable.ownerId, discordId),
                arrayOverlaps(roleTable.permissions, permissions),
              ),
            ),
          ),
        (rows) => rows.map(({ guild }) => guild),
      ),
    );
  }

  async getGuildOrder(userId: string) {
    const rows = await this.run((database) =>
      database
        .select({ guildsOrder: userSettingsTable.guildsOrder })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId))
        .limit(1),
    );
    return rows[0]?.guildsOrder ?? null;
  }

  async update(id: string, values: GuildWrite) {
    const rows = await this.run((database) =>
      database
        .update(guildTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(guildTable.id, id))
        .returning(),
    );
    return rows[0] ?? null;
  }

  async upsert(options: {
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
  }) {
    const now = new Date();
    const rows = await this.run((database) =>
      database
        .insert(guildTable)
        .values({ ...options, active: true, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: guildTable.id,
          set: { ...options, active: true, updatedAt: now },
        })
        .returning(),
    );
    const guild = rows[0];
    if (!guild) throw new Error("Guild was not returned");
    return guild;
  }

  getWorlds(guildId: string) {
    return this.run((database) =>
      database
        .selectDistinct({ world: timerTable.world })
        .from(timerTable)
        .where(eq(timerTable.guildId, guildId)),
    );
  }

  async findSyncState(guildId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(discordGuildSyncStateTable)
        .where(eq(discordGuildSyncStateTable.guildId, guildId))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  ensureDefaultLootlogConfig(guildId: string) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .insert(lootlogConfigTable)
              .values({ id: guildId, createdAt: now, updatedAt: now })
              .onConflictDoNothing();
            yield* transaction
              .insert(lootlogConfigNpcTable)
              .values(
                npcTypeEnum.enumValues.map((npcType) => ({
                  lootlogConfigId: guildId,
                  npcType,
                  allowedRarities: [...itemRarityEnum.enumValues],
                  createdAt: now,
                  updatedAt: now,
                })),
              )
              .onConflictDoNothing();
          }),
        ),
      ),
    );
  }

  deleteOrganization(guildId: string) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const guildRows = yield* transaction
              .select({ vanityUrl: guildTable.vanityUrl })
              .from(guildTable)
              .where(eq(guildTable.id, guildId))
              .limit(1);
            const members = yield* transaction
              .select({
                userId: memberTable.userId,
                guildId: memberTable.guildId,
                globalUserId: memberTable.globalUserId,
              })
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.guildId, guildId),
                  eq(memberTable.active, true),
                ),
              );
            yield* transaction
              .delete(lootlogConfigNpcTable)
              .where(eq(lootlogConfigNpcTable.lootlogConfigId, guildId));
            yield* transaction
              .delete(lootlogConfigTable)
              .where(eq(lootlogConfigTable.id, guildId));
            yield* transaction
              .update(memberTable)
              .set({
                active: false,
                lastDiscordAttemptAt: now,
                lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.GUILD_DEACTIVATED,
                updatedAt: now,
              })
              .where(
                and(
                  eq(memberTable.guildId, guildId),
                  eq(memberTable.active, true),
                ),
              );
            yield* transaction
              .delete(roleTable)
              .where(eq(roleTable.guildId, guildId));
            yield* transaction
              .update(guildTable)
              .set({ active: false, updatedAt: now })
              .where(eq(guildTable.id, guildId));
            return {
              vanityUrl: guildRows[0]?.vanityUrl ?? null,
              affectedMembers: members.map((member) => ({
                discordId: member.userId,
                guildId: member.guildId,
                globalUserId: member.globalUserId,
              })),
            };
          }),
        ),
      ),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
