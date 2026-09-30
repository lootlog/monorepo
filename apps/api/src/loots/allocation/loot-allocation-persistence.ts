import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  eq,
  exists,
  gte,
  isNull,
  ne,
  not,
  notExists,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import {
  requestApiKeyAccess,
  requestScopedIdentity,
} from "#src/runtime/auth/forward-auth-identity";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Schema } from "effect";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  memberTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/schema";
import type { LootShare } from "#src/loots/loot-response.schema";

type AuthorizedLootOptions = {
  readonly actorUserId: string;
  readonly lootId: number;
  readonly submissionCutoff: Date;
};

const databaseSubmissionCutoff = (cutoff: Date) =>
  sql`CURRENT_TIMESTAMP - ${Date.now() - cutoff.getTime()} * INTERVAL '1 millisecond'`;

const query = new QueryBuilder();

const allocationRecord = alias(
  organizationLootRecordTable,
  "allocation_record",
);

const allocationSubmission = alias(
  lootSubmissionTable,
  "allocation_submission",
);

const allocationMember = alias(memberTable, "allocation_member");

const authorizedSubmissionExists = (
  options: AuthorizedLootOptions,
  visibleSource: SQL,
) =>
  exists(
    query
      .select({ id: allocationRecord.id })
      .from(allocationRecord)
      .innerJoin(
        allocationSubmission,
        eq(allocationSubmission.organizationLootRecordId, allocationRecord.id),
      )
      .innerJoin(
        allocationMember,
        eq(allocationMember.id, allocationSubmission.memberId),
      )
      .where(
        and(
          eq(allocationRecord.lootId, lootTable.id),
          isNull(allocationRecord.archivedAt),
          eq(allocationMember.active, true),
          eq(allocationMember.globalUserId, options.actorUserId),
          visibleSource,
          gte(
            allocationSubmission.createdAt,
            databaseSubmissionCutoff(options.submissionCutoff),
          ),
        ),
      ),
  );

export class LootAllocationPersistenceError extends TaggedErrorClass<LootAllocationPersistenceError>()(
  "LootAllocationPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeLootAllocationPersistence = (
  database: typeof ApiDatabase.Service,
) => {
  const sourceAccess = (actorUserId: string) =>
    Effect.gen(function* () {
      const members = yield* database
        .select({ member: memberTable, ownerId: guildTable.ownerId })
        .from(memberTable)
        .innerJoin(guildTable, eq(guildTable.id, memberTable.guildId))
        .where(
          and(
            eq(memberTable.globalUserId, actorUserId),
            eq(memberTable.active, true),
            eq(guildTable.active, true),
          ),
        );

      const memberships = yield* hydrateMemberRoles(
        database,
        members.map(({ member, ownerId }) => ({ ...member, ownerId })),
      );

      return memberships.flatMap((member) => {
        const permissions =
          member.ownerId === member.userId
            ? [Permission.OWNER]
            : member.roles.flatMap((role) => role.permissions);

        if (
          !createAccessPolicy({ capabilities: permissions }).allows(
            Permission.LOOTLOG_LOOTS_WRITE,
          )
        )
          return [];

        return [
          {
            guildId: member.guildId,
            visibility:
              buildLootNpcVisibilityCondition(
                lootTable.id,
                permissions,
                member.roles,
              ) ?? sql`true`,
          },
        ];
      });
    });

  const allocationAuthorization = (options: AuthorizedLootOptions) =>
    Effect.gen(function* () {
      const sources = yield* sourceAccess(options.actorUserId);

      const visibleSource =
        or(
          ...sources.map(({ guildId, visibility }) =>
            and(eq(allocationRecord.guildId, guildId), visibility),
          ),
        ) ?? sql`false`;

      const submission = authorizedSubmissionExists(options, visibleSource);

      if (!(yield* requestApiKeyAccess)) return submission;
      const identity = yield* requestScopedIdentity;

      const guilds = yield* selectAccessibleGuilds(
        database,
        identity.discordId,
        [Permission.LOOTLOG_LOOTS_WRITE],
      );

      if (guilds.length === 0) return sql`false`;

      const visibleOrganizations =
        or(
          ...guilds.map(({ guild }) =>
            and(
              eq(organizationLootRecordTable.guildId, guild.id),
              isNull(organizationLootRecordTable.archivedAt),
              guild.ownerId === identity.discordId
                ? undefined
                : (sources.find((source) => source.guildId === guild.id)
                    ?.visibility ?? sql`false`),
            ),
          ),
        ) ?? sql`false`;

      // Allocation is shared by every organization record; never partially authorize a global update.
      return and(
        submission,
        notExists(
          query
            .select({ id: organizationLootRecordTable.id })
            .from(organizationLootRecordTable)
            .where(
              and(
                eq(organizationLootRecordTable.lootId, lootTable.id),
                not(visibleOrganizations),
              ),
            ),
        ),
      );
    });

  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new LootAllocationPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-allocation.drizzle", retryCount: 0 },
      }),
    );

  const findAuthorizedLoot = (options: AuthorizedLootOptions) =>
    protect(
      "loot-allocation.find-authorized",
      Effect.gen(function* () {
        const authorized = yield* allocationAuthorization(options);

        const [loot] = yield* database
          .select()
          .from(lootTable)
          .where(and(eq(lootTable.id, options.lootId), authorized))
          .limit(1);

        if (!loot) return null;

        const [items, players, npcs, records] = yield* Effect.all(
          [
            database
              .select({
                lootItem: lootItemTable,
                itemSnapshot: itemSnapshotTable,
              })
              .from(lootItemTable)
              .innerJoin(
                itemSnapshotTable,
                eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
              )
              .where(eq(lootItemTable.lootId, loot.id)),
            database
              .select({
                lootPlayer: lootPlayerTable,
                playerSnapshot: playerSnapshotTable,
              })
              .from(lootPlayerTable)
              .innerJoin(
                playerSnapshotTable,
                eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
              )
              .where(eq(lootPlayerTable.lootId, loot.id)),
            database
              .select({ lootNpc: lootNpcTable, npcSnapshot: npcSnapshotTable })
              .from(lootNpcTable)
              .innerJoin(
                npcSnapshotTable,
                eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
              )
              .where(eq(lootNpcTable.lootId, loot.id))
              .orderBy(asc(lootNpcTable.id)),
            database
              .select({ guildId: organizationLootRecordTable.guildId })
              .from(organizationLootRecordTable)
              .where(
                and(
                  eq(organizationLootRecordTable.lootId, loot.id),
                  isNull(organizationLootRecordTable.archivedAt),
                ),
              ),
          ] as const,
          { concurrency: "unbounded" },
        );

        return {
          ...loot,
          lootItems: items.map(({ lootItem, itemSnapshot }) => ({
            ...lootItem,
            itemSnapshot,
          })),
          lootPlayers: players.map(({ lootPlayer, playerSnapshot }) => ({
            ...lootPlayer,
            playerSnapshot,
          })),
          lootNpcs: npcs.map(({ lootNpc, npcSnapshot }) => ({
            ...lootNpc,
            npcSnapshot,
          })),
          organizationLootRecords: records,
        };
      }),
    );

  const compareAndSetChatAllocation = (
    options: AuthorizedLootOptions & { readonly lootShare: LootShare },
  ) =>
    protect(
      "loot-allocation.compare-and-set",
      Effect.gen(function* () {
        const authorized = yield* allocationAuthorization(options);

        return yield* database
          .update(lootTable)
          .set({
            lootShare: options.lootShare,
            lootShareSource: LootShareSource.CHAT_MESSAGE,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(lootTable.id, options.lootId),
              authorized,
              ne(lootTable.lootShareSource, LootShareSource.CHAT_MESSAGE),
            ),
          )
          .returning({ id: lootTable.id })
          .pipe(Effect.map((rows) => rows.length > 0));
      }),
    );

  const findAuthorizedAllocationState = (options: AuthorizedLootOptions) =>
    protect(
      "loot-allocation.find-state",
      Effect.gen(function* () {
        const authorized = yield* allocationAuthorization(options);

        return yield* database
          .select({
            lootShare: lootTable.lootShare,
            lootShareSource: lootTable.lootShareSource,
          })
          .from(lootTable)
          .where(and(eq(lootTable.id, options.lootId), authorized))
          .limit(1)
          .pipe(Effect.map((rows) => rows[0] ?? null));
      }),
    );

  return {
    findAuthorizedLoot,
    compareAndSetChatAllocation,
    findAuthorizedAllocationState,
  } as const;
};

export type LootAllocationPersistence = ReturnType<
  typeof makeLootAllocationPersistence
>;
