import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import type {
  Member,
  PlayerSnapshot,
  Timer,
  TimerHistoryAction,
} from "./timers.types.js";
import { TIMER_TYPES } from "./constants/timer-limits.js";

export type TimerWithRelations = Timer & {
  member?: Member | null;
  actorCharacter?: PlayerSnapshot | null;
};

export type TimerWrite = Omit<
  typeof timerTable.$inferInsert,
  "createdAt" | "updatedAt"
>;

export type TimerPatch = Partial<
  Omit<TimerWrite, "guildId" | "world" | "timerKey">
>;

export type HistoryWrite = {
  guildId: string;
  world: string;
  timerKey: string;
  npcId: number;
  npc: unknown;
  action: TimerHistoryAction;
  actorMemberId?: number;
  actorMemberUserId?: string;
  actorCharacterSnapshotId?: number | null;
  actorCharacterLvl?: number | null;
  minSpawnTime?: Date | null;
  maxSpawnTime?: Date | null;
  latestRespBaseSeconds?: number | null;
  latestRespawnRandomness?: number | null;
  wasReset?: boolean | null;
  windowOpenedAt?: Date | null;
  timerCreatedById?: number | null;
  timerActorCharacterSnapshotId?: number | null;
  timerActorCharacterLvl?: number | null;
};

const timerIdentity = (guildId: string, world: string, timerKey: string) =>
  and(
    eq(timerTable.guildId, guildId),
    eq(timerTable.world, world),
    eq(timerTable.timerKey, timerKey),
  );

export class TimersRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async upsertPlayerSnapshot(
    snapshot: Omit<PlayerSnapshot, "id" | "createdAt">,
  ) {
    const insertedRows = await this.run((database) =>
      database
        .insert(playerSnapshotTable)
        .values(snapshot)
        .onConflictDoNothing()
        .returning(),
    );
    const inserted = insertedRows[0];
    if (inserted) return inserted;

    const existingRows = await this.run((database) =>
      database
        .select()
        .from(playerSnapshotTable)
        .where(
          and(
            eq(playerSnapshotTable.world, snapshot.world),
            eq(playerSnapshotTable.accountId, snapshot.accountId),
            eq(playerSnapshotTable.characterId, snapshot.characterId),
            eq(playerSnapshotTable.snapshotHash, snapshot.snapshotHash),
          ),
        )
        .limit(1),
    );
    return this.requireRow(
      existingRows[0],
      "Player snapshot upsert returned no row",
    );
  }

  createHistoryEntry(data: HistoryWrite, retainedEntries: number) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            let actorMemberId = data.actorMemberId;
            if (actorMemberId === undefined) {
              const actorRows = yield* transaction
                .select({ id: memberTable.id })
                .from(memberTable)
                .where(
                  and(
                    eq(memberTable.userId, data.actorMemberUserId ?? ""),
                    eq(memberTable.guildId, data.guildId),
                  ),
                )
                .limit(1);
              actorMemberId = actorRows[0]?.id;
            }
            if (actorMemberId === undefined) {
              throw new Error("Timer history actor member was not found");
            }

            const inserted = yield* transaction
              .insert(timerHistoryEntryTable)
              .values({
                guildId: data.guildId,
                world: data.world,
                timerKey: data.timerKey,
                npcId: data.npcId,
                npc: data.npc,
                action: data.action,
                actorMemberId,
                actorCharacterSnapshotId: data.actorCharacterSnapshotId ?? null,
                actorCharacterLvl: data.actorCharacterLvl ?? null,
                minSpawnTime: data.minSpawnTime ?? null,
                maxSpawnTime: data.maxSpawnTime ?? null,
                latestRespBaseSeconds: data.latestRespBaseSeconds ?? null,
                latestRespawnRandomness: data.latestRespawnRandomness ?? null,
                wasReset: data.wasReset ?? null,
                windowOpenedAt: data.windowOpenedAt ?? null,
                timerCreatedById: data.timerCreatedById ?? null,
                timerActorCharacterSnapshotId:
                  data.timerActorCharacterSnapshotId ?? null,
                timerActorCharacterLvl: data.timerActorCharacterLvl ?? null,
              })
              .returning();

            const staleRows = yield* transaction
              .select({ id: timerHistoryEntryTable.id })
              .from(timerHistoryEntryTable)
              .where(
                and(
                  eq(timerHistoryEntryTable.guildId, data.guildId),
                  eq(timerHistoryEntryTable.world, data.world),
                  eq(timerHistoryEntryTable.timerKey, data.timerKey),
                ),
              )
              .orderBy(
                desc(timerHistoryEntryTable.createdAt),
                desc(timerHistoryEntryTable.id),
              )
              .offset(retainedEntries);
            if (staleRows.length > 0) {
              yield* transaction.delete(timerHistoryEntryTable).where(
                inArray(
                  timerHistoryEntryTable.id,
                  staleRows.map((row) => row.id),
                ),
              );
            }
            const entry = inserted[0];
            if (!entry) throw new Error("Timer history insert returned no row");
            return entry;
          }),
        ),
      ),
    );
  }

  async findTimerSettingsOverrides(userId: string) {
    const rows = await this.run((database) =>
      database
        .select({ overrides: userSettingDocumentTable.overrides })
        .from(userSettingDocumentTable)
        .where(
          and(
            eq(userSettingDocumentTable.userId, userId),
            eq(userSettingDocumentTable.domain, "timers"),
            eq(userSettingDocumentTable.scopeType, "USER"),
            eq(userSettingDocumentTable.scopeId, userId),
          ),
        )
        .limit(1),
    );
    return rows[0]?.overrides ?? null;
  }

  async findTimer(guildId: string, world: string, timerKey: string) {
    const rows = await this.selectTimers(
      timerIdentity(guildId, world, timerKey),
    );
    return rows[0] ?? null;
  }

  findTimersByNpcId(guildId: string, world: string, npcId: number) {
    return this.selectTimers(
      and(
        eq(timerTable.guildId, guildId),
        eq(timerTable.world, world),
        eq(timerTable.npcId, npcId),
      ),
    );
  }

  async upsertTimer(create: TimerWrite, update: TimerPatch) {
    const now = new Date();
    if (Object.keys(update).length === 0) {
      const insertedRows = await this.run((database) =>
        database
          .insert(timerTable)
          .values({ ...create, createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning(),
      );
      const inserted = insertedRows[0];
      if (inserted) return this.findReturnedTimer(inserted);
      const existing = await this.findTimer(
        create.guildId,
        create.world,
        create.timerKey,
      );
      return this.requireRow(
        existing ?? undefined,
        "Timer upsert returned no row",
      );
    }
    const rows = await this.run((database) =>
      database
        .insert(timerTable)
        .values({ ...create, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [timerTable.guildId, timerTable.world, timerTable.timerKey],
          set: { ...update, updatedAt: now },
        })
        .returning(),
    );
    return this.findReturnedTimer(rows[0]);
  }

  async upsertTimerForMember(
    userId: string,
    create: Omit<TimerWrite, "createdById">,
    update: Omit<TimerPatch, "createdById">,
  ) {
    const memberId = await this.requireMemberId(userId, create.guildId);
    return this.upsertTimer(
      { ...create, createdById: memberId },
      { ...update, createdById: memberId },
    );
  }

  async createTimerForMember(
    userId: string,
    timer: Omit<TimerWrite, "createdById">,
  ) {
    const memberId = await this.requireMemberId(userId, timer.guildId);
    const now = new Date();
    const rows = await this.run((database) =>
      database
        .insert(timerTable)
        .values({
          ...timer,
          createdById: memberId,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    );
    return this.findReturnedTimer(rows[0]);
  }

  async updateTimerForMember(
    userId: string,
    guildId: string,
    world: string,
    timerKey: string,
    patch: Omit<TimerPatch, "createdById">,
  ) {
    const memberId = await this.requireMemberId(userId, guildId);
    return this.updateTimer(guildId, world, timerKey, {
      ...patch,
      createdById: memberId,
    });
  }

  async updateTimer(
    guildId: string,
    world: string,
    timerKey: string,
    patch: TimerPatch,
  ) {
    const rows = await this.run((database) =>
      database
        .update(timerTable)
        .set({ ...patch, updatedAt: new Date() })
        .where(timerIdentity(guildId, world, timerKey))
        .returning(),
    );
    return rows[0] ? this.findReturnedTimer(rows[0]) : null;
  }

  async deleteTimer(guildId: string, world: string, timerKey: string) {
    const rows = await this.run((database) =>
      database
        .delete(timerTable)
        .where(timerIdentity(guildId, world, timerKey))
        .returning(),
    );
    return rows[0] ?? null;
  }

  findActiveTimerKeys(
    lookups: ReadonlyArray<{
      guildId: string;
      world: string;
      timerKey: string;
    }>,
  ) {
    return this.run((database) =>
      database
        .select({
          guildId: timerTable.guildId,
          world: timerTable.world,
          timerKey: timerTable.timerKey,
        })
        .from(timerTable)
        .where(
          or(
            ...lookups.map((lookup) =>
              timerIdentity(lookup.guildId, lookup.world, lookup.timerKey),
            ),
          ),
        ),
    );
  }

  findEventHeroTimersByKeys(
    guildId: string,
    world: string,
    timerKeys: string[],
  ) {
    return this.run((database) =>
      database
        .select({
          npcId: timerTable.npcId,
          timerKey: timerTable.timerKey,
          world: timerTable.world,
          minSpawnTime: timerTable.minSpawnTime,
          maxSpawnTime: timerTable.maxSpawnTime,
          npc: timerTable.npc,
        })
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            inArray(timerTable.timerKey, timerKeys),
          ),
        ),
    );
  }

  findEventHeroTimersByNames(
    guildId: string,
    world: string,
    npcNames: string[],
  ) {
    return this.run((database) =>
      database
        .select({
          npcId: timerTable.npcId,
          timerKey: timerTable.timerKey,
          world: timerTable.world,
          minSpawnTime: timerTable.minSpawnTime,
          maxSpawnTime: timerTable.maxSpawnTime,
          npc: timerTable.npc,
        })
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            sql`${timerTable.npc}->>'name' = ANY(${npcNames}::text[])`,
          ),
        ),
    );
  }

  async findWorlds(guildId: string) {
    const rows = await this.run((database) =>
      database
        .selectDistinct({ world: timerTable.world })
        .from(timerTable)
        .where(eq(timerTable.guildId, guildId)),
    );
    return rows.map((row) => row.world);
  }

  findVisibleTimers(options: {
    guildIds: string[];
    world?: string;
    alwaysVisibleExpiredTimerKeys: string[];
    now: Date;
  }) {
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);
    const regularTimer = and(
      isNull(timerTable.deletedAt),
      gt(timerTable.maxSpawnTime, options.now),
    );
    let visibility = regularTimer;
    if (options.alwaysVisibleExpiredTimerKeys.length > 0) {
      const selectedTimer = and(
        inArray(timerTable.timerKey, options.alwaysVisibleExpiredTimerKeys),
        sql`COALESCE(${timerTable.npc}->>'margonemType', '0') != ${manualTimerType}`,
        or(
          lte(timerTable.maxSpawnTime, options.now),
          isNotNull(timerTable.deletedAt),
        ),
      );
      visibility = or(regularTimer, selectedTimer) ?? regularTimer;
    }
    const organizationAndWorld = options.world
      ? and(
          inArray(timerTable.guildId, options.guildIds),
          eq(timerTable.world, options.world),
        )
      : inArray(timerTable.guildId, options.guildIds);
    return this.selectTimers(and(organizationAndWorld, visibility), true);
  }

  findHistory(
    guildId: string,
    world: string,
    timerKey: string | null,
    limit: number,
  ) {
    return this.selectHistory(
      timerKey === null
        ? and(
            eq(timerHistoryEntryTable.guildId, guildId),
            eq(timerHistoryEntryTable.world, world),
          )
        : and(
            eq(timerHistoryEntryTable.guildId, guildId),
            eq(timerHistoryEntryTable.world, world),
            eq(timerHistoryEntryTable.timerKey, timerKey),
          ),
      limit,
    );
  }

  async findHistoryById(guildId: string, id: number) {
    const rows = await this.selectHistory(
      and(
        eq(timerHistoryEntryTable.id, id),
        eq(timerHistoryEntryTable.guildId, guildId),
      ),
      1,
    );
    return rows[0] ?? null;
  }

  searchNpcs(guildId: string, world: string, search: string, limit: number) {
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);
    return this.run((database) =>
      database
        .selectDistinctOn([timerTable.timerKey], {
          npc: timerTable.npc,
          npcId: timerTable.npcId,
          timerKey: timerTable.timerKey,
          latestRespBaseSeconds: timerTable.latestRespBaseSeconds,
          latestRespawnRandomness: timerTable.latestRespawnRandomness,
        })
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            isNull(timerTable.deletedAt),
            sql`${timerTable.npc}->>'name' ILIKE ${`%${search}%`}`,
            sql`COALESCE(${timerTable.npc}->>'margonemType', '0') != ${manualTimerType}`,
          ),
        )
        .orderBy(timerTable.timerKey, desc(timerTable.updatedAt))
        .limit(limit),
    );
  }

  cleanupExpiredManualTimers(cutoffDate: Date, manualTimerType: number) {
    return this.run((database) =>
      database
        .delete(timerTable)
        .where(
          and(
            sql`${timerTable.maxSpawnTime} < ${cutoffDate}`,
            sql`(${timerTable.npc}->>'margonemType')::int = ${manualTimerType}`,
          ),
        )
        .returning({ timerKey: timerTable.timerKey }),
    ).then((rows) => rows.length);
  }

  private async findReturnedTimer(timer: Timer | undefined) {
    const row = this.requireRow(timer, "Timer mutation returned no row");
    return (await this.findTimer(row.guildId, row.world, row.timerKey)) ?? row;
  }

  private async requireMemberId(userId: string, guildId: string) {
    const rows = await this.run((database) =>
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(eq(memberTable.userId, userId), eq(memberTable.guildId, guildId)),
        )
        .limit(1),
    );
    const id = rows[0]?.id;
    if (id === undefined) throw new Error("Timer member was not found");
    return id;
  }

  private selectTimers(condition: ReturnType<typeof and>, newestFirst = false) {
    return this.run((database) => {
      const query = database
        .select({
          timer: timerTable,
          member: memberTable,
          actorCharacter: playerSnapshotTable,
        })
        .from(timerTable)
        .leftJoin(memberTable, eq(memberTable.id, timerTable.createdById))
        .leftJoin(
          playerSnapshotTable,
          eq(playerSnapshotTable.id, timerTable.actorCharacterSnapshotId),
        )
        .where(condition);
      return newestFirst ? query.orderBy(desc(timerTable.maxSpawnTime)) : query;
    }).then((rows) =>
      rows.map(({ timer, member, actorCharacter }) => ({
        ...timer,
        member,
        actorCharacter,
      })),
    );
  }

  private selectHistory(condition: ReturnType<typeof and>, limit: number) {
    return this.run((database) =>
      database
        .select({
          entry: timerHistoryEntryTable,
          guild: { name: guildTable.name },
          actorMember: memberTable,
          actorCharacter: playerSnapshotTable,
        })
        .from(timerHistoryEntryTable)
        .innerJoin(
          guildTable,
          eq(guildTable.id, timerHistoryEntryTable.guildId),
        )
        .innerJoin(
          memberTable,
          eq(memberTable.id, timerHistoryEntryTable.actorMemberId),
        )
        .leftJoin(
          playerSnapshotTable,
          eq(
            playerSnapshotTable.id,
            timerHistoryEntryTable.actorCharacterSnapshotId,
          ),
        )
        .where(condition)
        .orderBy(desc(timerHistoryEntryTable.createdAt))
        .limit(limit),
    ).then((rows) =>
      rows.map(({ entry, guild, actorMember, actorCharacter }) => ({
        ...entry,
        guild,
        actorMember,
        actorCharacter,
      })),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }

  private requireRow<T>(row: T | undefined, message: string): T {
    if (row === undefined) throw new Error(message);
    return row;
  }
}
