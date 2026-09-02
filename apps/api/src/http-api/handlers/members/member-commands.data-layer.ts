import { and, desc, eq, gte, isNotNull, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberRefreshJobTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { apiConfig } from "#src/config/api.config";
import {
  getAdminBulkRefreshRateLimit,
  getMemberCacheSoftTtl,
  getRefreshPermissionsTtl,
} from "#src/members/constants/member-cache.constant";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/constants/member-discord-status.constant";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import { ErrorKey } from "#src/members/enum/error-key.enum";
import { isTransientMemberSyncStatus } from "#src/members/member-discord-sync-status";
import type {
  MemberBulkRefreshJobData,
  MemberRefreshAttempt,
  MemberWithRoles,
  StoredMemberWithRoles,
} from "#src/members/member.types";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { ErrorKey as GuildErrorKey } from "#src/guilds/enum/error-key.enum";
import {
  MembersData,
  MembersOperationError,
  type MembersIdentity,
} from "./members.handlers.js";

export interface MemberCommandsPorts {
  readonly refreshGuildMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
    readonly throwOnUnexpectedError: boolean;
  }) => Effect.Effect<MemberRefreshAttempt, unknown>;
  readonly recordStaleUse: (
    reason: MemberRefreshAttempt["status"],
  ) => Effect.Effect<unknown, unknown>;
  readonly clearMemberCaches: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly publishMemberRemoved: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly enqueueBulkRefresh: (
    data: MemberBulkRefreshJobData,
  ) => Effect.Effect<unknown, unknown>;
  readonly publishRefreshJobUpdate: (job: {
    readonly jobId: number;
    readonly guildId: string;
    readonly status: "FAILED";
    readonly totalMembers: number;
    readonly processedMembers: number;
    readonly failedMembers: number;
    readonly completedAt: Date;
  }) => Effect.Effect<unknown, unknown>;
}

const STALE_ACCESS_GRACE_MS = 6 * 60 * 60 * 1000;

const failure = (cause: unknown) => new MembersOperationError({ cause });

type MemberReadDatabase = Pick<typeof ApiDatabase.Service, "select">;

const memberWithRoles = (
  database: MemberReadDatabase,
  discordId: string,
  guildId: string,
) =>
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
    if (!member) return null;
    const roleRows = yield* database
      .select({ role: roleTable })
      .from(memberToRoleTable)
      .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(eq(memberToRoleTable.A, member.id))
      .orderBy(desc(roleTable.position));
    return { ...member, roles: roleRows.map(({ role }) => role) };
  });

const isFresh = (member: StoredMemberWithRoles | null, cacheExpiry: Date) =>
  Boolean(
    member?.active &&
    member.lastDiscordSyncAt &&
    member.lastDiscordSyncAt.getTime() >= cacheExpiry.getTime(),
  );

const useStaleMember = (
  member: StoredMemberWithRoles | null,
  refreshAttempt: MemberRefreshAttempt,
  now: Date,
) =>
  Boolean(
    member?.active &&
    member.lastDiscordSyncAt &&
    (now.getTime() - member.lastDiscordSyncAt.getTime() <=
      STALE_ACCESS_GRACE_MS ||
      isTransientMemberSyncStatus(refreshAttempt.status)),
  );

const throwSyncError = (attempt: MemberRefreshAttempt) =>
  attempt.error instanceof Error
    ? Effect.fail(attempt.error)
    : Effect.fail(
        new HttpException("Discord member sync failed", HttpStatus.CONFLICT),
      );

export const makeMembersDataLayer = (ports: MemberCommandsPorts) =>
  Layer.effect(
    MembersData,
    Effect.map(ApiDatabase, (database) => {
      const getMember = (options: {
        readonly identity: MembersIdentity;
        readonly guildId: string;
        readonly refresh: boolean;
        readonly returnDeactivatedMember: boolean;
        readonly throwOnMemberUnauthorized: boolean;
      }): Effect.Effect<MemberWithRoles | null, unknown> =>
        Effect.gen(function* () {
          const guildRows = yield* database
            .select({ id: guildTable.id })
            .from(guildTable)
            .where(
              and(
                eq(guildTable.active, true),
                or(
                  eq(guildTable.id, options.guildId),
                  eq(guildTable.vanityUrl, options.guildId),
                ),
              ),
            )
            .limit(1);
          const desiredGuildId = guildRows[0]?.id;
          if (!desiredGuildId) {
            return yield* Effect.fail(
              new NotFoundException({ message: GuildErrorKey.GUILD_NOT_FOUND }),
            );
          }

          const now = new Date();
          const ttl = options.refresh
            ? getRefreshPermissionsTtl(apiConfig.environment)
            : getMemberCacheSoftTtl(apiConfig.environment);
          const stored = yield* memberWithRoles(
            database,
            options.identity.discordId,
            desiredGuildId,
          );
          const fresh = isFresh(stored, new Date(now.getTime() - ttl));
          if (stored && options.refresh && fresh) {
            return yield* Effect.fail(
              new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE),
            );
          }
          if (fresh) return stored;

          const refreshAttempt = yield* ports.refreshGuildMember({
            discordId: options.identity.discordId,
            guildId: desiredGuildId,
            userId: options.identity.userId,
            priority: options.refresh
              ? MEMBER_REFRESH_PRIORITY.MANUAL
              : MEMBER_REFRESH_PRIORITY.BACKGROUND,
            reason: options.refresh ? "manual-refresh" : "member-read",
            throwOnUnexpectedError: options.refresh,
          });
          if (
            refreshAttempt.status === "UNAUTHORIZED" &&
            options.throwOnMemberUnauthorized
          ) {
            return yield* throwSyncError(refreshAttempt);
          }
          if (refreshAttempt.member) {
            return refreshAttempt.member.active ||
              options.returnDeactivatedMember
              ? refreshAttempt.member
              : null;
          }
          if (refreshAttempt.status === "NOT_FOUND") return null;
          if (!useStaleMember(stored, refreshAttempt, now)) return null;

          yield* ports
            .recordStaleUse(refreshAttempt.status)
            .pipe(Effect.ignore);
          return {
            ...stored,
            isStale: true,
            staleWarning: refreshAttempt.refreshQueued
              ? "Using cached data while a Discord refresh is queued"
              : "Using cached data due to Discord API rate limiting or errors",
            refreshQueued: refreshAttempt.refreshQueued,
            nextRefreshAt: refreshAttempt.nextRefreshAt,
          };
        });

      const deactivate = (guildId: string, discordId: string) =>
        database
          .transaction((transaction) =>
            Effect.gen(function* () {
              const stored = yield* memberWithRoles(
                transaction,
                discordId,
                guildId,
              );
              if (!stored) {
                return yield* Effect.fail(
                  new NotFoundException("Member not found"),
                );
              }
              if (!stored.active) {
                return yield* Effect.fail(
                  new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED),
                );
              }
              const now = new Date();
              const rows = yield* transaction
                .update(memberTable)
                .set({
                  active: false,
                  lastDiscordAttemptAt: now,
                  lastDiscordStatus:
                    MEMBER_LAST_DISCORD_STATUS.MANUALLY_DEACTIVATED,
                  updatedAt: now,
                })
                .where(eq(memberTable.id, stored.id))
                .returning();
              const updated = rows[0];
              if (!updated) {
                return yield* Effect.fail(
                  new NotFoundException("Member not found"),
                );
              }
              yield* transaction
                .delete(memberToRoleTable)
                .where(eq(memberToRoleTable.A, stored.id));
              return { ...updated, roles: [] };
            }),
          )
          .pipe(
            Effect.tap((member) =>
              member.globalUserId
                ? Effect.all(
                    [
                      ports.clearMemberCaches({
                        discordId,
                        guildId,
                        userId: member.globalUserId,
                      }),
                      ports.publishMemberRemoved({
                        discordId,
                        guildId,
                        userId: member.globalUserId,
                      }),
                    ],
                    { concurrency: "unbounded" },
                  )
                : Effect.void,
            ),
          );

      const createBulkRefresh = (guildId: string, requestedBy: string) =>
        Effect.gen(function* () {
          const rateLimit = getAdminBulkRefreshRateLimit(apiConfig.environment);
          const recent = yield* database
            .select()
            .from(memberRefreshJobTable)
            .where(
              and(
                eq(memberRefreshJobTable.guildId, guildId),
                gte(
                  memberRefreshJobTable.createdAt,
                  new Date(Date.now() - rateLimit),
                ),
              ),
            )
            .orderBy(desc(memberRefreshJobTable.createdAt))
            .limit(1);
          if (recent[0]) {
            return yield* Effect.fail(
              new BadRequestException({
                message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
                nextAvailableAt: new Date(
                  recent[0].createdAt.getTime() + rateLimit,
                ),
              }),
            );
          }
          const members = yield* database
            .select({ userId: memberTable.userId })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, guildId),
                eq(memberTable.active, true),
                isNotNull(memberTable.globalUserId),
              ),
            );
          const now = new Date();
          const inserted = yield* database
            .insert(memberRefreshJobTable)
            .values({
              guildId,
              requestedBy,
              status: "PENDING",
              totalMembers: members.length,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          const job = inserted[0];
          if (!job)
            return yield* Effect.die("Member refresh job was not returned");

          yield* ports
            .enqueueBulkRefresh({
              jobId: job.id,
              guildId,
              memberIds: members.map(({ userId }) => userId),
            })
            .pipe(
              Effect.catch((error) =>
                Effect.gen(function* () {
                  const completedAt = new Date();
                  yield* database
                    .update(memberRefreshJobTable)
                    .set({
                      status: "FAILED",
                      completedAt,
                      updatedAt: completedAt,
                    })
                    .where(eq(memberRefreshJobTable.id, job.id));
                  yield* ports
                    .publishRefreshJobUpdate({
                      jobId: job.id,
                      guildId: job.guildId,
                      status: "FAILED",
                      totalMembers: job.totalMembers,
                      processedMembers: job.processedMembers,
                      failedMembers: job.failedMembers,
                      completedAt,
                    })
                    .pipe(Effect.ignore);
                  return yield* Effect.fail(error);
                }),
              ),
            );
          return {
            ...job,
            nextAvailableAt: new Date(job.createdAt.getTime() + rateLimit),
          };
        });

      const operation = <A>(effect: Effect.Effect<A, unknown>) =>
        effect.pipe(
          Effect.mapError(failure),
          Effect.withSpan("members.data", {
            attributes: { adapter: "members", retryCount: 0 },
          }),
        );

      return MembersData.of({
        getMe: (identity, guildId, refresh) =>
          operation(
            getMember({
              identity,
              guildId,
              refresh,
              returnDeactivatedMember: false,
              throwOnMemberUnauthorized: true,
            }),
          ),
        refreshMember: (guildId, discordId) =>
          operation(
            Effect.gen(function* () {
              const rows = yield* database
                .select({ userId: memberTable.globalUserId })
                .from(memberTable)
                .where(
                  and(
                    eq(memberTable.userId, discordId),
                    eq(memberTable.guildId, guildId),
                  ),
                )
                .limit(1);
              const userId = rows[0]?.userId;
              if (!userId) {
                return yield* Effect.fail(
                  new NotFoundException(
                    "Member not found or global user ID is missing",
                  ),
                );
              }
              return yield* getMember({
                identity: { discordId, userId },
                guildId,
                refresh: true,
                returnDeactivatedMember: true,
                throwOnMemberUnauthorized: false,
              });
            }),
          ),
        deactivateMember: (guildId, discordId) =>
          operation(deactivate(guildId, discordId)),
        refreshAllMembers: (guildId, discordId) =>
          operation(createBulkRefresh(guildId, discordId)),
      });
    }),
  );
