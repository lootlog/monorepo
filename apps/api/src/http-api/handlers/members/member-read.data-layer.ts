import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberRefreshJobTable,
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { serviceConfig } from "#src/config/service.config";
import { getAdminBulkRefreshRateLimit } from "#src/members/constants/member-cache.constant";
import { ErrorKey } from "#src/members/enum/error-key.enum";
import {
  getGuildMemberReferencesCacheKey,
  getGuildMembersSummaryCacheKey,
  getMemberLootlogConfigSummaryCacheKey,
} from "#src/shared/constants/cache.constant";
import { NotFoundException } from "#src/shared/http/http-errors";
import {
  MemberReadData,
  MemberRefreshJobData,
  MembersOperationError,
} from "./members.handlers.js";

export interface MemberReadCache {
  readonly getJson: <A>(key: string) => Effect.Effect<A | null, unknown>;
  readonly setJson: (
    key: string,
    value: unknown,
    ttl: number,
  ) => Effect.Effect<unknown, unknown>;
}

const snapshotKey = (accountId: number, characterId: number) =>
  `${accountId}:${characterId}`;
const summaryPermissions = new Set<Permission>([
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_ACCESS,
]);

const parseCharacterRef = (accountId: string, characterId: string) => {
  const parsedAccountId = Number(accountId);
  const parsedCharacterId = Number(characterId);
  return Number.isInteger(parsedAccountId) &&
    Number.isInteger(parsedCharacterId) &&
    parsedAccountId > 0 &&
    parsedCharacterId > 0
    ? { accountId: parsedAccountId, characterId: parsedCharacterId }
    : null;
};

export const makeMemberReadDataLayer = (cache: MemberReadCache) =>
  Layer.effect(
    MemberReadData,
    Effect.map(ApiDatabase, (database) => {
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new MembersOperationError({ cause })),
        );
      const membersWithRoles = (guildId: string, includeInactive: boolean) =>
        Effect.gen(function* () {
          const members = yield* database
            .select()
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, guildId),
                isNotNull(memberTable.globalUserId),
                includeInactive ? undefined : eq(memberTable.active, true),
              ),
            )
            .orderBy(asc(memberTable.name));
          if (members.length === 0) return [];
          const roles = yield* database
            .select({ memberId: memberToRoleTable.A, role: roleTable })
            .from(memberToRoleTable)
            .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
            .where(
              inArray(
                memberToRoleTable.A,
                members.map(({ id }) => id),
              ),
            )
            .orderBy(desc(roleTable.position));
          return members.map((member) => ({
            ...member,
            roles: roles
              .filter(({ memberId }) => memberId === member.id)
              .map(({ role }) => role),
          }));
        });
      const cached = <A>(
        key: string,
        ttl: number,
        load: Effect.Effect<A, unknown>,
      ) =>
        cache.getJson<A>(key).pipe(
          Effect.catch(() => Effect.succeed(null)),
          Effect.flatMap((value) =>
            value === null
              ? load.pipe(
                  Effect.tap((loaded) =>
                    cache.setJson(key, loaded, ttl).pipe(Effect.ignore),
                  ),
                )
              : Effect.succeed(value),
          ),
        );

      return MemberReadData.of({
        getGuildMembers: (guildId, includeInactive) =>
          operation(membersWithRoles(guildId, includeInactive)),
        getGuildMemberReferences: (guildId, includeInactive) =>
          operation(
            cached(
              getGuildMemberReferencesCacheKey(guildId, includeInactive),
              30,
              membersWithRoles(guildId, includeInactive).pipe(
                Effect.map((members) =>
                  members.map(
                    ({ id, userId, name, avatar, active, roles }) => ({
                      id,
                      userId,
                      name,
                      avatar,
                      active,
                      color: roles[0]?.color ?? null,
                    }),
                  ),
                ),
              ),
            ),
          ),
        getGuildMembersSummary: (guildId) =>
          operation(
            cached(
              getGuildMembersSummaryCacheKey(guildId),
              30,
              Effect.gen(function* () {
                const owners = yield* database
                  .select({ ownerId: guildTable.ownerId })
                  .from(guildTable)
                  .where(
                    and(
                      eq(guildTable.id, guildId),
                      eq(guildTable.active, true),
                    ),
                  )
                  .limit(1);
                const ownerId = owners[0]?.ownerId;
                if (!ownerId) return [];
                const members = yield* membersWithRoles(guildId, false);
                return members
                  .filter(
                    (member) =>
                      member.userId === ownerId ||
                      member.roles.some(({ permissions }) =>
                        permissions.some((permission) =>
                          summaryPermissions.has(permission),
                        ),
                      ),
                  )
                  .map(({ id, userId, name, avatar, roles }) => ({
                    id,
                    userId,
                    name,
                    avatar,
                    color: roles[0]?.color ?? null,
                  }));
              }),
            ),
          ),
        getLootlogConfigSummary: (guildId, discordId) =>
          operation(
            cached(
              getMemberLootlogConfigSummaryCacheKey(guildId, discordId),
              60,
              Effect.gen(function* () {
                const members = yield* database
                  .select()
                  .from(memberTable)
                  .where(
                    and(
                      eq(memberTable.userId, discordId),
                      eq(memberTable.guildId, guildId),
                    ),
                  )
                  .limit(1);
                const member = members[0];
                if (!member) {
                  return yield* Effect.fail(
                    new NotFoundException("Member not found"),
                  );
                }
                const configs = yield* database
                  .select()
                  .from(userCharactersLootlogSettingsTable)
                  .where(
                    eq(userCharactersLootlogSettingsTable.userId, discordId),
                  )
                  .orderBy(
                    asc(userCharactersLootlogSettingsTable.accountId),
                    asc(userCharactersLootlogSettingsTable.characterId),
                  );
                const references = [
                  ...new Map(
                    configs
                      .map(({ accountId, characterId }) =>
                        parseCharacterRef(accountId, characterId),
                      )
                      .filter(
                        (
                          reference,
                        ): reference is {
                          accountId: number;
                          characterId: number;
                        } => reference !== null,
                      )
                      .map((reference) => [
                        snapshotKey(reference.accountId, reference.characterId),
                        reference,
                      ]),
                  ).values(),
                ];
                const snapshots =
                  references.length === 0
                    ? []
                    : yield* database
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
                                eq(
                                  playerSnapshotTable.accountId,
                                  reference.accountId,
                                ),
                                eq(
                                  playerSnapshotTable.characterId,
                                  reference.characterId,
                                ),
                              ),
                            ),
                          ),
                        )
                        .orderBy(desc(playerSnapshotTable.createdAt));
                const latest = new Map<string, (typeof snapshots)[number]>();
                for (const snapshot of snapshots) {
                  const key = snapshotKey(
                    snapshot.accountId,
                    snapshot.characterId,
                  );
                  if (!latest.has(key)) latest.set(key, snapshot);
                }
                const characters = configs.map((config) => {
                  const reference = parseCharacterRef(
                    config.accountId,
                    config.characterId,
                  );
                  const snapshot = reference
                    ? latest.get(
                        snapshotKey(reference.accountId, reference.characterId),
                      )
                    : undefined;
                  return {
                    accountId: config.accountId,
                    characterId: config.characterId,
                    enabledForGuild: config.catchingGuildIds.includes(guildId),
                    characterName: snapshot?.name ?? null,
                    world: snapshot?.world ?? null,
                    icon: snapshot?.icon ?? null,
                    metadataStatus: reference
                      ? snapshot
                        ? ("resolved" as const)
                        : ("missing_snapshot" as const)
                      : ("invalid_character_ref" as const),
                  };
                });
                return {
                  memberUserId: member.userId,
                  guildId,
                  isActive: member.active,
                  configuredCharacterCount: characters.length,
                  enabledCharacterCount: characters.filter(
                    ({ enabledForGuild }) => enabledForGuild,
                  ).length,
                  characters,
                };
              }),
            ),
          ),
      });
    }),
  );

export const MemberRefreshJobDataLive = Layer.effect(
  MemberRefreshJobData,
  Effect.map(ApiDatabase, (database) => {
    const withCooldown = (job: typeof memberRefreshJobTable.$inferSelect) => ({
      ...job,
      nextAvailableAt: new Date(
        job.createdAt.getTime() +
          getAdminBulkRefreshRateLimit(serviceConfig.env),
      ),
    });
    const operation = <A, E>(effect: Effect.Effect<A, E>) =>
      effect.pipe(
        Effect.mapError((cause) => new MembersOperationError({ cause })),
      );
    return MemberRefreshJobData.of({
      getLatestRefreshJob: (guildId) =>
        operation(
          database
            .select()
            .from(memberRefreshJobTable)
            .where(eq(memberRefreshJobTable.guildId, guildId))
            .orderBy(desc(memberRefreshJobTable.createdAt))
            .limit(1)
            .pipe(
              Effect.map((rows) => (rows[0] ? withCooldown(rows[0]) : null)),
            ),
        ),
      getRefreshJobStatus: (guildId, jobId) =>
        operation(
          Effect.gen(function* () {
            const rows = yield* database
              .select()
              .from(memberRefreshJobTable)
              .where(
                and(
                  eq(memberRefreshJobTable.id, jobId),
                  eq(memberRefreshJobTable.guildId, guildId),
                ),
              )
              .limit(1);
            const job = rows[0];
            return job
              ? withCooldown(job)
              : yield* Effect.fail(
                  new NotFoundException({
                    message: ErrorKey.REFRESH_JOB_NOT_FOUND,
                  }),
                );
          }),
        ),
    });
  }),
);
