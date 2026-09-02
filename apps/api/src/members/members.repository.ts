import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  notInArray,
  or,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "../database/drizzle/schema.js";

type MemberWrite = {
  readonly avatar: string | null;
  readonly banner: string | null;
  readonly name: string;
  readonly active: boolean;
  readonly globalUserId: string;
  readonly lastDiscordAttemptAt: Date;
  readonly lastDiscordSyncAt: Date;
  readonly lastDiscordStatus: string;
};

@Injectable()
export class MembersRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findGuildMembers(guildId: string, includeInactive = false) {
    const members = await this.run((database) =>
      database
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, guildId),
            isNotNull(memberTable.globalUserId),
            includeInactive ? undefined : eq(memberTable.active, true),
          ),
        )
        .orderBy(asc(memberTable.name)),
    );
    return this.attachRoles(members);
  }

  async findMember(userId: string, guildId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(memberTable)
        .where(
          and(eq(memberTable.userId, userId), eq(memberTable.guildId, guildId)),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findMemberWithRoles(userId: string, guildId: string) {
    const member = await this.findMember(userId, guildId);
    if (!member) return null;
    return (await this.attachRoles([member]))[0] ?? null;
  }

  async findMembersByUserGuildIds(
    userId: string,
    guildIds: ReadonlyArray<string>,
    activeOnly = false,
  ) {
    if (guildIds.length === 0) return [];
    const members = await this.run((database) =>
      database
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, userId),
            inArray(memberTable.guildId, [...guildIds]),
            activeOnly ? eq(memberTable.active, true) : undefined,
          ),
        ),
    );
    return this.attachRoles(members);
  }

  async findActiveGuildOwner(guildId: string) {
    const rows = await this.run((database) =>
      database
        .select({ ownerId: guildTable.ownerId })
        .from(guildTable)
        .where(and(eq(guildTable.id, guildId), eq(guildTable.active, true)))
        .limit(1),
    );
    return rows[0]?.ownerId ?? null;
  }

  async findGuildMembersSummary(guildId: string, ownerId: string) {
    const visiblePermissions = new Set(["OWNER", "ADMIN", "LOOTLOG_ACCESS"]);
    return (await this.findGuildMembers(guildId)).filter(
      (member) =>
        member.userId === ownerId ||
        member.roles.some((role) =>
          role.permissions.some((permission) =>
            visiblePermissions.has(permission),
          ),
        ),
    );
  }

  async resolveActiveGuildId(idOrVanityUrl: string) {
    const rows = await this.run((database) =>
      database
        .select({ id: guildTable.id })
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
    return rows[0]?.id ?? null;
  }

  findLootlogConfigs(userId: string) {
    return this.run((database) =>
      database
        .select()
        .from(userCharactersLootlogSettingsTable)
        .where(eq(userCharactersLootlogSettingsTable.userId, userId))
        .orderBy(
          asc(userCharactersLootlogSettingsTable.accountId),
          asc(userCharactersLootlogSettingsTable.characterId),
        ),
    );
  }

  findPlayerSnapshots(
    references: ReadonlyArray<{ accountId: number; characterId: number }>,
  ) {
    return this.run((database) =>
      database
        .select({
          accountId: playerSnapshotTable.accountId,
          characterId: playerSnapshotTable.characterId,
          name: playerSnapshotTable.name,
          world: playerSnapshotTable.world,
          icon: playerSnapshotTable.icon,
        })
        .from(playerSnapshotTable)
        .where(
          or(
            ...references.map((reference) =>
              and(
                eq(playerSnapshotTable.accountId, reference.accountId),
                eq(playerSnapshotTable.characterId, reference.characterId),
              ),
            ),
          ),
        )
        .orderBy(desc(playerSnapshotTable.createdAt)),
    );
  }

  async findExistingRoleIds(roleIds: ReadonlyArray<string>, guildId: string) {
    if (roleIds.length === 0) return [];
    const rows = await this.run((database) =>
      database
        .select({ id: roleTable.id })
        .from(roleTable)
        .where(
          and(
            inArray(roleTable.id, [...roleIds]),
            eq(roleTable.guildId, guildId),
          ),
        ),
    );
    return rows.map(({ id }) => id);
  }

  upsertMemberWithRoles(
    userId: string,
    guildId: string,
    values: MemberWrite,
    roleIds: ReadonlyArray<string>,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const rows = yield* transaction
              .insert(memberTable)
              .values({
                userId,
                guildId,
                ...values,
                createdAt: values.lastDiscordSyncAt,
                updatedAt: values.lastDiscordSyncAt,
              })
              .onConflictDoUpdate({
                target: [memberTable.userId, memberTable.guildId],
                set: { ...values, updatedAt: values.lastDiscordSyncAt },
              })
              .returning();
            const member = rows[0];
            if (!member) return yield* Effect.die("Member was not returned");

            yield* transaction
              .delete(memberToRoleTable)
              .where(eq(memberToRoleTable.A, member.id));
            if (roleIds.length > 0) {
              yield* transaction
                .insert(memberToRoleTable)
                .values(roleIds.map((roleId) => ({ A: member.id, B: roleId })))
                .onConflictDoNothing();
            }
            const roles =
              roleIds.length === 0
                ? []
                : yield* transaction
                    .select()
                    .from(roleTable)
                    .where(inArray(roleTable.id, [...roleIds]));
            return { ...member, roles };
          }),
        ),
      ),
    );
  }

  async markSyncAttempt(options: {
    userId: string;
    guildId: string;
    status: string;
    deactivate: boolean;
    markSynced: boolean;
    attemptedAt: Date;
  }) {
    const existing = await this.findMember(options.userId, options.guildId);
    if (!existing) return null;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const rows = yield* transaction
              .update(memberTable)
              .set({
                lastDiscordAttemptAt: options.attemptedAt,
                lastDiscordStatus: options.status,
                ...(options.markSynced
                  ? { lastDiscordSyncAt: options.attemptedAt }
                  : {}),
                ...(options.deactivate ? { active: false } : {}),
                updatedAt: options.attemptedAt,
              })
              .where(eq(memberTable.id, existing.id))
              .returning();
            if (options.deactivate) {
              yield* transaction
                .delete(memberToRoleTable)
                .where(eq(memberToRoleTable.A, existing.id));
            }
            const member = rows[0];
            if (!member) return null;
            if (options.deactivate) return { ...member, roles: [] };
            const roleRows = yield* transaction
              .select({ role: roleTable })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
              .where(eq(memberToRoleTable.A, existing.id));
            return { ...member, roles: roleRows.map(({ role }) => role) };
          }),
        ),
      ),
    );
  }

  async deactivateMember(
    userId: string,
    guildId: string,
    attemptedAt: Date,
    status: string,
  ) {
    const previous = await this.findMemberWithRoles(userId, guildId);
    if (!previous) return null;
    const updated = await this.markSyncAttempt({
      userId,
      guildId,
      status,
      deactivate: true,
      markSynced: false,
      attemptedAt,
    });
    return updated ? { previous, updated } : null;
  }

  findMissingActiveMembers(
    userId: string,
    globalUserId: string,
    activeGuildIds: ReadonlyArray<string>,
  ) {
    return this.run((database) =>
      database
        .select({
          id: memberTable.id,
          userId: memberTable.userId,
          guildId: memberTable.guildId,
          globalUserId: memberTable.globalUserId,
        })
        .from(memberTable)
        .innerJoin(guildTable, eq(memberTable.guildId, guildTable.id))
        .where(
          and(
            eq(memberTable.userId, userId),
            eq(memberTable.globalUserId, globalUserId),
            eq(memberTable.active, true),
            eq(guildTable.active, true),
            activeGuildIds.length > 0
              ? notInArray(memberTable.guildId, [...activeGuildIds])
              : undefined,
          ),
        ),
    );
  }

  deactivateMembers(
    members: ReadonlyArray<{ id: number }>,
    attemptedAt: Date,
    status: string,
    markSynced: boolean,
  ) {
    if (members.length === 0) return Promise.resolve();
    const ids = members.map(({ id }) => id);
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .update(memberTable)
              .set({
                active: false,
                lastDiscordAttemptAt: attemptedAt,
                ...(markSynced ? { lastDiscordSyncAt: attemptedAt } : {}),
                lastDiscordStatus: status,
                updatedAt: attemptedAt,
              })
              .where(inArray(memberTable.id, ids));
            yield* transaction
              .delete(memberToRoleTable)
              .where(inArray(memberToRoleTable.A, ids));
          }),
        ),
      ),
    );
  }

  async deactivateGuildMembers(
    guildId: string,
    attemptedAt: Date,
    status: string,
  ) {
    const members = await this.run((database) =>
      database
        .select({
          id: memberTable.id,
          userId: memberTable.userId,
          guildId: memberTable.guildId,
          globalUserId: memberTable.globalUserId,
        })
        .from(memberTable)
        .where(
          and(eq(memberTable.guildId, guildId), eq(memberTable.active, true)),
        ),
    );
    const updated = await this.run((database) =>
      database
        .update(memberTable)
        .set({
          active: false,
          lastDiscordAttemptAt: attemptedAt,
          lastDiscordStatus: status,
          updatedAt: attemptedAt,
        })
        .where(
          and(eq(memberTable.guildId, guildId), eq(memberTable.active, true)),
        )
        .returning({ id: memberTable.id }),
    );
    return { count: updated.length, members };
  }

  private async attachRoles(
    members: ReadonlyArray<typeof memberTable.$inferSelect>,
  ) {
    if (members.length === 0) return [];
    const memberIds = members.map(({ id }) => id);
    const rows = await this.run((database) =>
      database
        .select({ memberId: memberToRoleTable.A, role: roleTable })
        .from(memberToRoleTable)
        .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
        .where(inArray(memberToRoleTable.A, memberIds))
        .orderBy(desc(roleTable.position)),
    );
    return members.map((member) => ({
      ...member,
      roles: rows
        .filter(({ memberId }) => memberId === member.id)
        .map(({ role }) => role),
    }));
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
