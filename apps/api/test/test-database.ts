import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";
import * as tables from "../src/database/drizzle/schema.js";

type UnknownRecord = Record<string, any>;
type QueryArguments = {
  readonly where?: UnknownRecord;
  readonly include?: UnknownRecord;
  readonly select?: UnknownRecord;
  readonly orderBy?: UnknownRecord | ReadonlyArray<UnknownRecord>;
};

const first = <A>(rows: ReadonlyArray<A>, message: string): A => {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(message);
  }
  return row;
};

const connectIds = (relation: unknown): ReadonlyArray<string | number> => {
  if (typeof relation !== "object" || relation === null) {
    return [];
  }
  const connect = (relation as UnknownRecord).connect;
  const entries = Array.isArray(connect) ? connect : [connect];
  return entries.flatMap((entry) =>
    typeof entry === "object" && entry !== null && "id" in entry
      ? [(entry as UnknownRecord).id]
      : [],
  );
};

class TestTableRepository {
  constructor(
    private readonly owner: TestDatabase,
    private readonly table: PgTable,
  ) {}

  async create(args: { readonly data: UnknownRecord }): Promise<any> {
    const { data, nested } = this.prepareInsert(args.data);
    const rows = await this.owner.run(
      this.owner.client.insert(this.table).values(data).returning(),
    );
    const row = first(rows, `Insert into ${this.tableName} returned no row`);
    await this.writeNestedRelations(row, nested);
    return row;
  }

  async createMany(args: {
    readonly data: UnknownRecord | ReadonlyArray<UnknownRecord>;
    readonly skipDuplicates?: boolean;
  }): Promise<{ count: number }> {
    const values = (Array.isArray(args.data) ? args.data : [args.data]).map(
      (data) => this.prepareInsert(data).data,
    );
    let insert = this.owner.client.insert(this.table).values(values);
    if (args.skipDuplicates === true) {
      insert = insert.onConflictDoNothing() as typeof insert;
    }
    const rows = await this.owner.run(insert.returning());
    return { count: rows.length };
  }

  async count(args: QueryArguments = {}): Promise<number> {
    const condition = this.where(args.where);
    const query = this.owner.client
      .select({ value: count() })
      .from(this.table)
      .$dynamic();
    const rows = await this.owner.run(
      condition === undefined ? query : query.where(condition),
    );
    return first(rows, `Count on ${this.tableName} returned no row`).value;
  }

  async findMany(args: QueryArguments = {}): Promise<any[]> {
    const selection = this.selection(args.select);
    const query = (
      selection === undefined
        ? this.owner.client.select()
        : this.owner.client.select(selection)
    )
      .from(this.table)
      .$dynamic();
    const condition = this.where(args.where);
    const ordered = this.orderBy(
      condition === undefined ? query : query.where(condition),
      args.orderBy,
    );
    const rows = await this.owner.run(ordered);
    return this.include(rows as any[], args.include);
  }

  async findFirst(args: QueryArguments = {}): Promise<any | null> {
    return (await this.findMany(args))[0] ?? null;
  }

  findUnique(args: QueryArguments): Promise<any | null> {
    return this.findFirst(args);
  }

  async findUniqueOrThrow(args: QueryArguments): Promise<any> {
    const row = await this.findFirst(args);
    if (row === null) {
      throw new Error(`${this.tableName} row not found`);
    }
    return row;
  }

  async update(
    args: QueryArguments & { readonly data: UnknownRecord },
  ): Promise<any> {
    const { data, nested } = this.prepareUpdate(args.data);
    const condition = this.where(args.where);
    if (condition === undefined) {
      throw new Error(`Refusing unscoped update of ${this.tableName}`);
    }
    const rows = await this.owner.run(
      this.owner.client
        .update(this.table)
        .set(data)
        .where(condition)
        .returning(),
    );
    const row = first(rows, `${this.tableName} row not found for update`);
    await this.writeNestedRelations(row, nested);
    return row;
  }

  async delete(args: QueryArguments): Promise<any> {
    const condition = this.where(args.where);
    if (condition === undefined) {
      throw new Error(`Refusing unscoped delete of ${this.tableName}`);
    }
    const rows = await this.owner.run(
      this.owner.client.delete(this.table).where(condition).returning(),
    );
    return first(rows, `${this.tableName} row not found for delete`);
  }

  async upsert(args: {
    readonly where: UnknownRecord;
    readonly create: UnknownRecord;
    readonly update: UnknownRecord;
  }): Promise<any> {
    const existing = await this.findFirst({ where: args.where });
    return existing === null
      ? this.create({ data: args.create })
      : this.update({ where: args.where, data: args.update });
  }

  private get tableName() {
    return this.table[Symbol.for("drizzle:Name")];
  }

  private prepareInsert(input: UnknownRecord) {
    const data = { ...input };
    const nested = this.extractNested(data);
    const columns = getTableColumns(this.table);
    if (columns.updatedAt !== undefined && data.updatedAt === undefined) {
      data.updatedAt = new Date();
    }
    const id = columns.id;
    if (
      id !== undefined &&
      data.id === undefined &&
      !id.hasDefault &&
      id.dataType === "string"
    ) {
      data.id = randomUUID();
    }
    return { data, nested };
  }

  private prepareUpdate(input: UnknownRecord) {
    const data = { ...input };
    const nested = this.extractNested(data);
    if (getTableColumns(this.table).updatedAt !== undefined) {
      data.updatedAt ??= new Date();
    }
    return { data, nested };
  }

  private extractNested(data: UnknownRecord) {
    const nested: UnknownRecord = {};
    for (const key of ["roles", "assignedMembers", "npcs"]) {
      if (key in data) {
        nested[key] = data[key];
        delete data[key];
      }
    }
    return nested;
  }

  private async writeNestedRelations(
    row: UnknownRecord,
    nested: UnknownRecord,
  ) {
    if (this.table === tables.memberTable && nested.roles !== undefined) {
      const roleIds = connectIds(nested.roles);
      if (roleIds.length > 0) {
        await this.owner.run(
          this.owner.client
            .insert(tables.memberToRoleTable)
            .values(roleIds.map((roleId) => ({ A: row.id, B: String(roleId) })))
            .onConflictDoNothing(),
        );
      }
    }
    if (
      this.table === tables.eventMapTable &&
      nested.assignedMembers !== undefined
    ) {
      const memberIds = connectIds(nested.assignedMembers);
      if (memberIds.length > 0) {
        await this.owner.run(
          this.owner.client
            .insert(tables.eventMapToMemberTable)
            .values(
              memberIds.map((memberId) => ({ A: row.id, B: Number(memberId) })),
            )
            .onConflictDoNothing(),
        );
      }
    }
    if (this.table === tables.lootlogConfigTable && nested.npcs !== undefined) {
      const create = (nested.npcs as UnknownRecord).create;
      const npcs = Array.isArray(create)
        ? create
        : create === undefined
          ? []
          : [create];
      if (npcs.length > 0) {
        await this.owner.run(
          this.owner.client.insert(tables.lootlogConfigNpcTable).values(
            npcs.map((npc) => ({
              ...npc,
              lootlogConfigId: row.id,
              updatedAt: npc.updatedAt ?? new Date(),
            })),
          ),
        );
      }
    }
  }

  private selection(select: UnknownRecord | undefined) {
    if (select === undefined) {
      return undefined;
    }
    const columns = getTableColumns(this.table);
    return Object.fromEntries(
      Object.entries(select).flatMap(([name, enabled]) =>
        enabled === true && columns[name] !== undefined
          ? [[name, columns[name]]]
          : [],
      ),
    );
  }

  private where(where: UnknownRecord | undefined): SQL | undefined {
    if (where === undefined) {
      return undefined;
    }
    const columns = getTableColumns(this.table);
    const conditions: SQL[] = [];
    for (const [name, value] of Object.entries(where)) {
      if (name === "AND" || name === "OR") {
        const entries = Array.isArray(value) ? value : [value];
        const nested = entries.flatMap((entry) => {
          const condition = this.where(entry);
          return condition === undefined ? [] : [condition];
        });
        const condition = name === "AND" ? and(...nested) : or(...nested);
        if (condition !== undefined) conditions.push(condition);
        continue;
      }
      if (name === "NOT") {
        const nested = this.where(value);
        if (nested !== undefined) conditions.push(not(nested));
        continue;
      }
      const column = columns[name];
      if (column === undefined) {
        if (typeof value === "object" && value !== null) {
          const nested = this.where(value);
          if (nested !== undefined) conditions.push(nested);
          continue;
        }
        throw new Error(`Unknown ${this.tableName} filter column: ${name}`);
      }
      conditions.push(this.columnCondition(column, value));
    }
    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private columnCondition(column: AnyPgColumn, value: unknown): SQL {
    if (value === null) return isNull(column);
    if (typeof value !== "object" || value instanceof Date) {
      return eq(column, value);
    }
    const filter = value as UnknownRecord;
    const conditions = Object.entries(filter).map(([operator, operand]) => {
      switch (operator) {
        case "equals":
          return operand === null ? isNull(column) : eq(column, operand);
        case "not":
          return operand === null ? isNotNull(column) : ne(column, operand);
        case "in":
          return inArray(column, operand as ReadonlyArray<any>);
        case "notIn":
          return not(inArray(column, operand as any[]));
        case "gt":
          return gt(column, operand);
        case "gte":
          return gte(column, operand);
        case "lt":
          return lt(column, operand);
        case "lte":
          return lte(column, operand);
        case "contains":
          return like(column, `%${String(operand)}%`);
        case "startsWith":
          return like(column, `${String(operand)}%`);
        case "endsWith":
          return like(column, `%${String(operand)}`);
        case "mode":
          return sql`true`;
        default:
          throw new Error(`Unsupported ${this.tableName} filter: ${operator}`);
      }
    });
    return and(...conditions) ?? sql`true`;
  }

  private orderBy(query: any, orderBy: QueryArguments["orderBy"]) {
    if (orderBy === undefined) return query;
    const columns = getTableColumns(this.table);
    const orders = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap(
      (entry) =>
        Object.entries(entry).flatMap(([name, direction]) => {
          const column = columns[name];
          if (column === undefined) return [];
          return [direction === "desc" ? desc(column) : asc(column)];
        }),
    );
    return orders.length === 0 ? query : query.orderBy(...orders);
  }

  private include(
    rows: any[],
    include: UnknownRecord | undefined,
  ): Promise<any[]> {
    if (include === undefined) return Promise.resolve(rows);
    return Promise.all(
      rows.map(async (row) => {
        const result = { ...row };
        if (this.table === tables.memberTable && include.roles === true) {
          result.roles = await this.owner.run(
            this.owner.client
              .select(getTableColumns(tables.roleTable))
              .from(tables.memberToRoleTable)
              .innerJoin(
                tables.roleTable,
                eq(tables.memberToRoleTable.B, tables.roleTable.id),
              )
              .where(eq(tables.memberToRoleTable.A, row.id)),
          );
        }
        if (
          this.table === tables.lootSubmissionTable &&
          include.organizationLootRecord === true
        ) {
          const related = await this.owner.run(
            this.owner.client
              .select()
              .from(tables.organizationLootRecordTable)
              .where(
                eq(
                  tables.organizationLootRecordTable.id,
                  row.organizationLootRecordId,
                ),
              )
              .limit(1),
          );
          result.organizationLootRecord = related[0] ?? null;
        }
        if (
          this.table === tables.eventHeroKillTable &&
          include.points === true
        ) {
          result.points = await this.owner.run(
            this.owner.client
              .select()
              .from(tables.eventKillPointTable)
              .where(eq(tables.eventKillPointTable.killId, row.id)),
          );
        }
        return result;
      }),
    );
  }
}

export class TestDatabase {
  private readonly runtime = ManagedRuntime.make(ApiDatabaseLive);
  private database: ApiDatabaseValue | undefined;

  readonly guild = new TestTableRepository(this, tables.guildTable);
  readonly role = new TestTableRepository(this, tables.roleTable);
  readonly member = new TestTableRepository(this, tables.memberTable);
  readonly timer = new TestTableRepository(this, tables.timerTable);
  readonly event = new TestTableRepository(this, tables.eventTable);
  readonly eventHeroNpc = new TestTableRepository(
    this,
    tables.eventHeroNpcTable,
  );
  readonly eventMap = new TestTableRepository(this, tables.eventMapTable);
  readonly eventMapLocation = new TestTableRepository(
    this,
    tables.eventMapLocationTable,
  );
  readonly eventMapAssignmentHistory = new TestTableRepository(
    this,
    tables.eventMapAssignmentHistoryTable,
  );
  readonly eventMapCoverageGap = new TestTableRepository(
    this,
    tables.eventMapCoverageGapTable,
  );
  readonly eventPresenceLog = new TestTableRepository(
    this,
    tables.eventPresenceLogTable,
  );
  readonly eventHeroKill = new TestTableRepository(
    this,
    tables.eventHeroKillTable,
  );
  readonly eventKillPoint = new TestTableRepository(
    this,
    tables.eventKillPointTable,
  );
  readonly eventRanking = new TestTableRepository(
    this,
    tables.eventRankingTable,
  );
  readonly userPinnedEvent = new TestTableRepository(
    this,
    tables.userPinnedEventTable,
  );
  readonly userCharactersLootlogSettings = new TestTableRepository(
    this,
    tables.userCharactersLootlogSettingsTable,
  );
  readonly userSettings = new TestTableRepository(
    this,
    tables.userSettingsTable,
  );
  readonly userKillStats = new TestTableRepository(
    this,
    tables.userKillStatsTable,
  );
  readonly npcKillStats = new TestTableRepository(
    this,
    tables.npcKillStatsTable,
  );
  readonly guildKillSummary = new TestTableRepository(
    this,
    tables.guildKillSummaryTable,
  );
  readonly loot = new TestTableRepository(this, tables.lootTable);
  readonly lootSubmission = new TestTableRepository(
    this,
    tables.lootSubmissionTable,
  );
  readonly lootlogConfig = new TestTableRepository(
    this,
    tables.lootlogConfigTable,
  );
  readonly npcSnapshot = new TestTableRepository(this, tables.npcSnapshotTable);

  get client(): ApiDatabaseValue {
    if (this.database === undefined) {
      throw new Error("Test database has not been initialized");
    }
    return this.database;
  }

  async initialize() {
    this.database = await this.runtime.runPromise(
      Effect.gen(function* () {
        return yield* ApiDatabase;
      }),
    );
    return this;
  }

  run<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
    return this.runtime.runPromise(effect);
  }

  async truncate(...tableNames: ReadonlyArray<string>) {
    const identifiers = tableNames.map(
      (name) => `"${name.replaceAll('"', '""')}"`,
    );
    await this.run(
      this.client.execute(
        sql.raw(`TRUNCATE TABLE ${identifiers.join(", ")} CASCADE`),
      ),
    );
  }

  async dispose() {
    await this.runtime.dispose();
  }
}

export type Guild = typeof tables.guildTable.$inferSelect;
export type Role = typeof tables.roleTable.$inferSelect;
export type Member = typeof tables.memberTable.$inferSelect;
export type Event = typeof tables.eventTable.$inferSelect;
export type EventHeroNpc = typeof tables.eventHeroNpcTable.$inferSelect;
export type EventMap = typeof tables.eventMapTable.$inferSelect;
export type EventMapLocation = typeof tables.eventMapLocationTable.$inferSelect;
export type EventHeroKill = typeof tables.eventHeroKillTable.$inferSelect;
export type EventRanking = typeof tables.eventRankingTable.$inferSelect;
