import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  eq,
  exists,
  gte,
  isNotNull,
  isNull,
  ne,
  not,
  notExists,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias, type AnyPgColumn, QueryBuilder } from "drizzle-orm/pg-core";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import {
  createAccessPolicy,
  memberCapabilities,
} from "@lootlog/domain/access-policy";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import {
  buildUserLootRecordCondition,
  loadUserLootScopes,
} from "#src/loots/query/user-loot-scopes";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
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
  readonly actorDiscordId: string;
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
          eq(allocationMember.userId, options.actorDiscordId),
          eq(allocationMember.active, true),
          isNotNull(allocationMember.globalUserId),
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
  /** Organizations, inside the API key scope, where the actor may write this loot. */
  const writableOrganizations = (actorDiscordId: string) =>
    Effect.gen(function* () {
      const keyScope = yield* apiKeyOrganizationFilter(guildTable.id);

      const members = yield* database
        .select({ member: memberTable, ownerId: guildTable.ownerId })
        .from(memberTable)
        .innerJoin(guildTable, activeGuildMemberJoin(actorDiscordId))
        .where(and(eq(guildTable.active, true), keyScope));

      const memberships = yield* hydrateMemberRoles(
        database,
        members.map(({ member, ownerId }) => ({ ...member, ownerId })),
      );

      return memberships.flatMap((member) => {
        const permissions = memberCapabilities({
          ownerId: member.ownerId,
          viewerId: actorDiscordId,
          roles: member.roles,
        });

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

  // The allocation lives on the shared loot, so it changes in every
  // Organization that keeps a record of it. Sessions and API keys alike may
  // change it only when they may write it in each of those Organizations.
  const allocationAuthorization = (options: AuthorizedLootOptions) =>
    Effect.gen(function* () {
      const organizations = yield* writableOrganizations(
        options.actorDiscordId,
      );

      const writableIn = (recordGuildId: AnyPgColumn) =>
        or(
          ...organizations.map(({ guildId, visibility }) =>
            and(eq(recordGuildId, guildId), visibility),
          ),
        ) ?? sql`false`;

      return and(
        authorizedSubmissionExists(
          options,
          writableIn(allocationRecord.guildId),
        ),
        notExists(
          query
            .select({ id: organizationLootRecordTable.id })
            .from(organizationLootRecordTable)
            .where(
              and(
                eq(organizationLootRecordTable.lootId, lootTable.id),
                isNull(organizationLootRecordTable.archivedAt),
                not(writableIn(organizationLootRecordTable.guildId)),
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

  /** Whether the actor can read the loot at all, to tell a hidden loot from a denied update. */
  const isLootVisible = (options: {
    readonly actorDiscordId: string;
    readonly lootId: number;
  }) =>
    protect(
      "loot-allocation.is-visible",
      Effect.gen(function* () {
        const scopes = yield* loadUserLootScopes(
          database,
          options.actorDiscordId,
        );

        const rows = yield* database
          .select({ id: organizationLootRecordTable.id })
          .from(organizationLootRecordTable)
          .where(
            and(
              eq(organizationLootRecordTable.lootId, options.lootId),
              isNull(organizationLootRecordTable.archivedAt),
              buildUserLootRecordCondition(
                scopes,
                options.actorDiscordId,
                organizationLootRecordTable.lootId,
              ),
            ),
          )
          .limit(1);

        return rows.length > 0;
      }),
    );

  return {
    isLootVisible,
    findAuthorizedLoot,
    compareAndSetChatAllocation,
    findAuthorizedAllocationState,
  } as const;
};

export type LootAllocationPersistence = ReturnType<
  typeof makeLootAllocationPersistence
>;
