/// <reference types="temporal-polyfill/types/global" />

import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { param } from "@prisma/orm-family-sql/relational-core/expression";
import type {
  ActivityDatabase,
  ActivityDatabaseOutputTypes,
  ActivityDatabaseTransaction,
} from "./database.js";
import contractJson from "./generated/contract.json";

type DynamicValue = any;
type DynamicRecord = Record<string, DynamicValue>;

export type ActivityApplicationModelDelegate<_Row> = {
  findMany(args?: DynamicRecord): Promise<any[]>;
  findFirst(args?: DynamicRecord): Promise<any>;
  findFirstOrThrow(args?: DynamicRecord): Promise<any>;
  findUnique(args: DynamicRecord): Promise<any>;
  create(args: DynamicRecord): Promise<any>;
  createMany(args: DynamicRecord): Promise<{ count: number }>;
  update(args: DynamicRecord): Promise<any>;
  updateMany(args: DynamicRecord): Promise<{ count: number }>;
  upsert(args: DynamicRecord): Promise<any>;
  delete(args: DynamicRecord): Promise<any>;
  deleteMany(args?: DynamicRecord): Promise<{ count: number }>;
  count(args?: DynamicRecord): Promise<number>;
  groupBy(args: DynamicRecord): Promise<any[]>;
};

export type ActivityApplicationOrm = {
  public: {
    [Model in keyof ActivityDatabaseOutputTypes["public"]]: ActivityApplicationModelDelegate<
      ActivityDatabaseOutputTypes["public"][Model]
    >;
  };
};

export type ActivityApplicationTransaction = Omit<
  ActivityDatabaseTransaction,
  "orm"
> & { orm: ActivityApplicationOrm };

export type ActivityApplicationDatabase = Omit<
  ActivityDatabase,
  "orm" | "transaction"
> & {
  orm: ActivityApplicationOrm;
  transaction<Result>(
    callback: (transaction: ActivityApplicationTransaction) => Promise<Result>,
  ): Promise<Result>;
};

type ClientContext = {
  native: DynamicRecord;
  raw: DynamicRecord;
  sql: DynamicRecord;
  query(plan: DynamicValue): Promise<DynamicRecord[]>;
};
const models = contractJson.domain.namespaces.public.models as DynamicRecord;
const storageTables = contractJson.storage.namespaces.public.entries
  .table as DynamicRecord;

function metadata(modelName: string): DynamicRecord {
  const model = models[modelName];
  if (!model) {
    throw new Error(`Unknown Activity model: ${modelName}`);
  }
  return model;
}

function fieldName(modelName: string, requestedName: string): string {
  return requestedName === "type" && metadata(modelName).fields._type
    ? "_type"
    : requestedName;
}

function toDatabaseValue(
  modelName: string,
  requestedName: string,
  value: DynamicValue,
) {
  if (!(value instanceof Date)) {
    return value;
  }
  const actualName = fieldName(modelName, requestedName);
  const codecId = metadata(modelName).fields[actualName]?.type?.codecId;
  return codecId === "pg/timestamptz-temporal@1"
    ? Temporal.Instant.fromEpochMilliseconds(value.getTime())
    : value;
}

export function normalizeActivityDatabaseValue(
  value: DynamicValue,
): DynamicValue {
  if (value instanceof Temporal.Instant) {
    return new Date(value.epochMilliseconds);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeActivityDatabaseValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key === "_type" ? "type" : key,
      normalizeActivityDatabaseValue(item),
    ]),
  );
}

function flattenCriterion(criterion: DynamicRecord): DynamicRecord {
  const result: DynamicRecord = {};
  for (const [key, value] of Object.entries(criterion)) {
    if (
      key.includes("_") &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// eslint-disable-next-line complexity -- the switch mirrors Prisma filter operators at one boundary
function scalarPredicate(
  accessor: DynamicRecord,
  modelName: string,
  requestedName: string,
  filter: DynamicValue,
) {
  if (filter === null) return accessor.isNull();
  if (
    typeof filter !== "object" ||
    filter instanceof Date ||
    Array.isArray(filter)
  ) {
    return accessor.eq(toDatabaseValue(modelName, requestedName, filter));
  }

  const predicates: DynamicValue[] = [];
  for (const [operation, operand] of Object.entries(filter)) {
    const normalized = toDatabaseValue(modelName, requestedName, operand);
    switch (operation) {
      case "equals":
        predicates.push(
          operand === null ? accessor.isNull() : accessor.eq(normalized),
        );
        break;
      case "not":
        predicates.push(
          operand === null
            ? accessor.isNotNull()
            : typeof operand === "object"
              ? not(
                  scalarPredicate(accessor, modelName, requestedName, operand),
                )
              : accessor.neq(normalized),
        );
        break;
      case "in":
        predicates.push(accessor.in(normalized));
        break;
      case "notIn":
        predicates.push(accessor.notIn(normalized));
        break;
      case "lt":
      case "lte":
      case "gt":
      case "gte":
        predicates.push(accessor[operation](normalized));
        break;
      case "contains":
        predicates.push(
          filter.mode === "insensitive"
            ? accessor.ilike(`%${operand}%`)
            : accessor.contains(operand),
        );
        break;
      case "startsWith":
        predicates.push(
          filter.mode === "insensitive"
            ? accessor.ilike(`${operand}%`)
            : accessor.startsWith(operand),
        );
        break;
      case "endsWith":
        predicates.push(
          filter.mode === "insensitive"
            ? accessor.ilike(`%${operand}`)
            : accessor.endsWith(operand),
        );
        break;
      case "mode":
        break;
      default:
        throw new Error(`Unsupported Activity filter operator: ${operation}`);
    }
  }
  return and(...predicates);
}

function whereExpression(
  proxy: DynamicRecord,
  modelName: string,
  where: DynamicRecord,
) {
  const predicates: DynamicValue[] = [];
  for (const [requestedName, filter] of Object.entries(where)) {
    if (filter === undefined) continue;
    if (requestedName === "AND" || requestedName === "OR") {
      const values = Array.isArray(filter) ? filter : [filter];
      const nested = values.map((item) =>
        whereExpression(proxy, modelName, item),
      );
      predicates.push(requestedName === "AND" ? and(...nested) : or(...nested));
      continue;
    }
    if (requestedName === "NOT") {
      predicates.push(not(whereExpression(proxy, modelName, filter)));
      continue;
    }

    const relation = metadata(modelName).relations[requestedName];
    if (relation) {
      const relationWhere = filter.is ?? filter.isNot ?? filter;
      const relationPredicate = proxy[requestedName].where(
        (related: DynamicRecord) =>
          whereExpression(related, relation.to.model, relationWhere),
      );
      predicates.push(
        filter.isNot ? not(relationPredicate) : relationPredicate,
      );
      continue;
    }

    const actualName = fieldName(modelName, requestedName);
    predicates.push(
      scalarPredicate(proxy[actualName], modelName, requestedName, filter),
    );
  }
  return and(...predicates);
}

function applyArgs(
  collection: DynamicValue,
  modelName: string,
  args: DynamicRecord = {},
  applyWhere = true,
) {
  if (applyWhere && args.where) {
    collection = collection.where((proxy: DynamicRecord) =>
      whereExpression(proxy, modelName, args.where),
    );
  }
  if (args.orderBy) {
    const entries = (
      Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]
    ).flatMap((item: DynamicRecord) => Object.entries(item));
    collection = collection.orderBy(
      entries.map(
        ([name, direction]) =>
          (proxy: DynamicRecord) =>
            proxy[fieldName(modelName, name)][direction](),
      ),
    );
  }
  const selection = args.select as DynamicRecord | undefined;
  const include = args.include as DynamicRecord | undefined;
  if (selection) {
    const fields = Object.entries(selection)
      .filter(
        ([name, enabled]) =>
          enabled === true && !metadata(modelName).relations[name],
      )
      .map(([name]) => fieldName(modelName, name));
    if (fields.length > 0) collection = collection.select(...fields);
  }
  for (const [name, relationArgs] of Object.entries({
    ...(include ?? {}),
    ...(selection ?? {}),
  })) {
    const relation = metadata(modelName).relations[name];
    if (!relation || !relationArgs) continue;
    collection = collection.include(
      name,
      relationArgs === true
        ? undefined
        : (branch: DynamicValue) =>
            applyArgs(branch, relation.to.model, relationArgs, false),
    );
  }
  if (args.distinct) {
    const fields = Array.isArray(args.distinct)
      ? args.distinct
      : [args.distinct];
    collection = collection.distinct(
      ...fields.map((name: string) => fieldName(modelName, name)),
    );
  }
  if (typeof args.skip === "number") collection = collection.offset(args.skip);
  if (typeof args.take === "number")
    collection = collection.limit(Math.abs(args.take));
  return collection;
}

function mutationData(modelName: string, data: DynamicRecord): DynamicRecord {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [
        fieldName(modelName, name),
        toDatabaseValue(modelName, name, value),
      ]),
  );
}

function withUpdatedAt(modelName: string, data: DynamicRecord): DynamicRecord {
  return metadata(modelName).fields.updatedAt
    ? { ...data, updatedAt: new Date() }
    : data;
}

const atomicOperators = {
  decrement: "-",
  divide: "/",
  increment: "+",
  multiply: "*",
} as const;

const numericCodecIds = new Set([
  "pg/float4@1",
  "pg/float8@1",
  "pg/int2@1",
  "pg/int4@1",
  "pg/int8@1",
  "pg/numeric@1",
]);

function atomicUpdate(
  modelName: string,
  requestedName: string,
  value: DynamicValue,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const actualName = fieldName(modelName, requestedName);
  const codecId = metadata(modelName).fields[actualName]?.type?.codecId;
  if (!numericCodecIds.has(codecId)) {
    return undefined;
  }
  for (const [operation, operator] of Object.entries(atomicOperators)) {
    if (operation in value) {
      return { operand: value[operation], operator };
    }
  }
  return undefined;
}

function hasAtomicUpdates(modelName: string, data: DynamicRecord) {
  return Object.entries(data).some(([name, value]) =>
    atomicUpdate(modelName, name, value),
  );
}

function rawTemplate(parts: readonly string[]): TemplateStringsArray {
  const strings = [...parts] as unknown as TemplateStringsArray & {
    raw: readonly string[];
  };
  Object.defineProperty(strings, "raw", { value: [...parts] });
  return strings;
}

function storageColumn(modelName: string, requestedName: string) {
  const actualName = fieldName(modelName, requestedName);
  const model = metadata(modelName);
  const columnName = model.storage.fields[actualName]?.column;
  const column = storageTables[model.storage.table]?.columns[columnName];
  if (!columnName || !column) {
    throw new Error(`Unknown storage column for ${modelName}.${requestedName}`);
  }
  return { column, columnName };
}

function mutationExpression(
  fields: DynamicRecord,
  functions: DynamicRecord,
  modelName: string,
  requestedName: string,
  value: DynamicValue,
) {
  const { column, columnName } = storageColumn(modelName, requestedName);
  const atomic = atomicUpdate(modelName, requestedName, value);
  if (atomic) {
    return functions
      .raw(
        rawTemplate(["", ` ${atomic.operator} `, ""]),
        fields[columnName],
        param(atomic.operand, { codecId: column.codecId }),
      )
      .returns({ codecId: column.codecId, nullable: column.nullable });
  }
  const normalized = toDatabaseValue(modelName, requestedName, value);
  if (column.codecId === "pg/enum@1") {
    const typeName = String(column.typeParams?.typeName).replaceAll('"', '""');
    return functions
      .raw(
        rawTemplate(["", `::"${typeName}"`]),
        param(String(normalized), { codecId: "pg/text@1" }),
      )
      .returns({ codecId: column.codecId, nullable: column.nullable });
  }
  return functions.raw`${param(normalized, {
    codecId: column.codecId,
  })}`.returns({ codecId: column.codecId, nullable: column.nullable });
}

async function executeAtomicUpdate(
  context: ClientContext,
  modelName: string,
  where: DynamicRecord,
  inputData: DynamicRecord,
) {
  const data = withUpdatedAt(modelName, inputData);
  const atomicField = Object.entries(data).find(([name, value]) =>
    atomicUpdate(modelName, name, value),
  );
  if (!atomicField) {
    return false;
  }
  const model = metadata(modelName);
  const table = context.sql.public[model.storage.table];
  let query = table.update((fields: DynamicRecord, functions: DynamicRecord) =>
    Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([requestedName, value]) => {
          const { columnName } = storageColumn(modelName, requestedName);
          return [
            columnName,
            mutationExpression(
              fields,
              functions,
              modelName,
              requestedName,
              value,
            ),
          ];
        }),
    ),
  );
  query = query.where((fields: DynamicRecord, functions: DynamicRecord) => {
    const predicates = Object.entries(flattenCriterion(where)).map(
      ([requestedName, value]) => {
        const { columnName } = storageColumn(modelName, requestedName);
        return functions.eq(
          fields[columnName],
          toDatabaseValue(modelName, requestedName, value),
        );
      },
    );
    return functions.and(...predicates);
  });
  const { columnName: returningColumn } = storageColumn(
    modelName,
    atomicField[0],
  );
  const rows = await context.query(query.returning(returningColumn).build());
  return rows.length > 0;
}

class ActivityModelDelegate {
  constructor(
    private readonly context: ClientContext,
    private readonly modelName: string,
  ) {}

  private collection() {
    return this.context.native.orm.public[this.modelName];
  }

  async findMany(args: DynamicRecord = {}) {
    return normalizeActivityDatabaseValue(
      await applyArgs(this.collection(), this.modelName, args).all(),
    );
  }

  async findFirst(args: DynamicRecord = {}) {
    return normalizeActivityDatabaseValue(
      await applyArgs(this.collection(), this.modelName, args).first(),
    );
  }

  async findFirstOrThrow(args: DynamicRecord = {}) {
    const row = await this.findFirst(args);
    if (!row)
      throw Object.assign(new Error("Record not found"), {
        code: "RUNTIME.NO_ROWS",
      });
    return row;
  }

  async findUnique(args: DynamicRecord) {
    return this.findFirst({ ...args, where: flattenCriterion(args.where) });
  }

  async create(args: DynamicRecord) {
    const row = await applyArgs(this.collection(), this.modelName, args).create(
      mutationData(this.modelName, withUpdatedAt(this.modelName, args.data)),
    );
    return normalizeActivityDatabaseValue(row);
  }

  async createMany(args: DynamicRecord) {
    const values = Array.isArray(args.data) ? args.data : [args.data];
    let count = 0;
    for (const value of values) {
      try {
        await this.collection().create(
          mutationData(this.modelName, withUpdatedAt(this.modelName, value)),
        );
        count += 1;
      } catch (error) {
        if (!args.skipDuplicates || !isActivityUniqueConstraintError(error))
          throw error;
      }
    }
    return { count };
  }

  async update(args: DynamicRecord) {
    if (hasAtomicUpdates(this.modelName, args.data)) {
      const updated = await executeAtomicUpdate(
        this.context,
        this.modelName,
        args.where,
        args.data,
      );
      if (!updated) {
        throw Object.assign(new Error("Record not found"), {
          code: "RUNTIME.NO_ROWS",
        });
      }
      return this.findFirstOrThrow({
        where: args.where,
        select: args.select,
        include: args.include,
      });
    }
    const row = await applyArgs(
      this.collection().where((proxy: DynamicRecord) =>
        whereExpression(proxy, this.modelName, flattenCriterion(args.where)),
      ),
      this.modelName,
      args,
      false,
    ).update(
      mutationData(this.modelName, withUpdatedAt(this.modelName, args.data)),
    );
    if (!row) {
      throw Object.assign(new Error("Record not found"), {
        code: "RUNTIME.NO_ROWS",
      });
    }
    return normalizeActivityDatabaseValue(row);
  }

  async updateMany(args: DynamicRecord) {
    const rows = await this.findMany({ where: args.where });
    for (const row of rows) {
      const key = metadata(this.modelName).fields.id
        ? { id: row.id }
        : args.where;
      await this.update({ where: key, data: args.data });
    }
    return { count: rows.length };
  }

  async upsert(args: DynamicRecord) {
    const criterion = flattenCriterion(args.where);
    if (hasAtomicUpdates(this.modelName, args.update)) {
      const fetchResult = () =>
        this.findFirstOrThrow({
          where: criterion,
          select: args.select,
          include: args.include,
        });
      if (
        await executeAtomicUpdate(
          this.context,
          this.modelName,
          criterion,
          args.update,
        )
      ) {
        return fetchResult();
      }
      try {
        return await this.create({
          data: args.create,
          select: args.select,
          include: args.include,
        });
      } catch (error) {
        if (!isActivityUniqueConstraintError(error)) {
          throw error;
        }
        if (
          await executeAtomicUpdate(
            this.context,
            this.modelName,
            criterion,
            args.update,
          )
        ) {
          return fetchResult();
        }
        throw error;
      }
    }
    const current = await this.findFirst({ where: criterion });
    if (current)
      return this.update({ ...args, where: criterion, data: args.update });
    return this.create({ ...args, data: args.create });
  }

  async delete(args: DynamicRecord) {
    const row = await this.collection()
      .where((proxy: DynamicRecord) =>
        whereExpression(proxy, this.modelName, flattenCriterion(args.where)),
      )
      .delete();
    return normalizeActivityDatabaseValue(row);
  }

  async deleteMany(args: DynamicRecord = {}) {
    const collection = args.where
      ? this.collection().where((proxy: DynamicRecord) =>
          whereExpression(proxy, this.modelName, args.where),
        )
      : this.collection();
    return { count: await collection.deleteAndCount() };
  }

  async count(args: DynamicRecord = {}) {
    const collection = applyArgs(this.collection(), this.modelName, args);
    const result = await collection.aggregate((aggregate: DynamicRecord) => ({
      count: aggregate.count(),
    }));
    return result.count;
  }

  async groupBy(args: DynamicRecord) {
    const collection = applyArgs(
      this.collection(),
      this.modelName,
      args,
    ).groupBy(
      ...args.by.map((name: string) => fieldName(this.modelName, name)),
    );
    const rows = await collection.aggregate((aggregate: DynamicRecord) => {
      const result: DynamicRecord = {};
      for (const [field, enabled] of Object.entries(args._count ?? {})) {
        if (enabled)
          result[`count_${field}`] = aggregate.count(
            fieldName(this.modelName, field),
          );
      }
      return result;
    });
    return normalizeActivityDatabaseValue(
      rows.map((row: DynamicRecord) => {
        const result = Object.fromEntries(
          args.by.map((name: string) => [
            name,
            row[fieldName(this.modelName, name)],
          ]),
        );
        result._count = Object.fromEntries(
          Object.entries(row)
            .filter(([key]) => key.startsWith("count_"))
            .map(([key, value]) => [key.slice(6), value]),
        );
        return result;
      }),
    );
  }
}

function createOrm(context: ClientContext): ActivityApplicationOrm {
  return {
    public: Object.fromEntries(
      Object.keys(models).map((modelName) => [
        modelName,
        new ActivityModelDelegate(context, modelName),
      ]),
    ),
  } as unknown as ActivityApplicationOrm;
}

export function createActivityApplicationDatabase(
  nativeDatabase: ActivityDatabase,
): ActivityApplicationDatabase {
  const native = nativeDatabase as DynamicRecord;
  const context: ClientContext = {
    native,
    raw: native.raw,
    sql: native.sql,
    query: async (plan) => (await native.runtime()).query(plan),
  };
  return {
    ...nativeDatabase,
    orm: createOrm(context),
    transaction: (callback) =>
      nativeDatabase.transaction(async (nativeTransaction) => {
        const transactionContext: ClientContext = {
          native: nativeTransaction as DynamicRecord,
          raw: native.raw,
          sql: native.sql,
          query: (plan) =>
            (nativeTransaction as unknown as DynamicRecord).query(plan),
        };
        const transaction = {
          ...nativeTransaction,
          orm: createOrm(transactionContext),
        } as ActivityApplicationTransaction;
        return callback(transaction);
      }),
  };
}

function hasSqlState(error: unknown, sqlState: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { sqlState?: string; cause?: unknown };
  return (
    candidate.sqlState === sqlState ||
    (candidate.cause !== error && hasSqlState(candidate.cause, sqlState))
  );
}

export function isActivityUniqueConstraintError(error: unknown): boolean {
  return hasSqlState(error, "23505");
}
