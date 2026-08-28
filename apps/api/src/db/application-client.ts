/// <reference types="temporal-polyfill/types/global" />

import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { param } from "@prisma/orm-family-sql/relational-core/expression";
import type {
  ApiDatabase,
  ApiDatabaseOutputTypes,
  ApiDatabaseTransaction,
} from "./database.js";
import contractJson from "./generated/contract.json";

// Prisma 8 RC intentionally exposes a fluent collection API. This adapter is
// the application boundary used during the coordinated cutover: callers keep
// their stable result shapes while every operation is executed by that API.
type DynamicValue = any;
type DynamicRecord = Record<string, DynamicValue>;
type DynamicSql = (
  strings: TemplateStringsArray,
  ...values: DynamicValue[]
) => DynamicRecord;

type ApplicationScalar<T> = T extends
  | Temporal.Instant
  | Temporal.PlainDateTime
  | Temporal.PlainDate
  | Temporal.PlainTime
  ? Date
  : T;

type ApplicationFields<T> = {
  [K in keyof T as K extends "_type" ? "type" : K]: ApplicationScalar<T[K]>;
};

export type ApiApplicationRow<Row> = ApplicationFields<Row> & DynamicRecord;

export type ApiApplicationModelDelegate<Row> = {
  findMany(args?: DynamicRecord): Promise<any[]>;
  findFirst(args?: DynamicRecord): Promise<any>;
  findFirstOrThrow(args?: DynamicRecord): Promise<any>;
  findUnique(args: DynamicRecord): Promise<any>;
  findUniqueOrThrow(args: DynamicRecord): Promise<any>;
  create(args: DynamicRecord): Promise<any>;
  createMany(args: DynamicRecord): Promise<{ count: number }>;
  update(args: DynamicRecord): Promise<any>;
  updateMany(args: DynamicRecord): Promise<{ count: number }>;
  upsert(args: DynamicRecord): Promise<any>;
  delete(args: DynamicRecord): Promise<any>;
  deleteMany(args?: DynamicRecord): Promise<{ count: number }>;
  count(args?: DynamicRecord): Promise<number>;
  aggregate(args: DynamicRecord): Promise<any>;
  groupBy(args: DynamicRecord): Promise<any[]>;
};

export type ApiApplicationOrm = {
  public: {
    [Model in keyof ApiDatabaseOutputTypes["public"]]: ApiApplicationModelDelegate<
      ApiDatabaseOutputTypes["public"][Model]
    >;
  };
};

export type ApiApplicationTransaction = Omit<ApiDatabaseTransaction, "orm"> & {
  orm: ApiApplicationOrm;
};

export type ApiApplicationDatabase = Omit<
  ApiDatabase,
  "orm" | "transaction"
> & {
  orm: ApiApplicationOrm;
  transaction<Result>(
    callback: (transaction: ApiApplicationTransaction) => Promise<Result>,
    options?: { isolationLevel?: "Serializable" },
  ): Promise<Result>;
};

type ModelMetadata = {
  fields: DynamicRecord;
  relations: DynamicRecord;
  storage: {
    fields: Record<string, { column: string }>;
    table: string;
  };
};

type ClientContext = {
  native: DynamicRecord;
  raw: DynamicRecord;
  sql: DynamicRecord;
  query(plan: DynamicValue): Promise<DynamicRecord[]>;
};

type RelationAlias = {
  actual: string;
  target: string;
};

type ManyToManyRelation = {
  junctionRelation: "eventMapToMembers" | "memberToRoles";
  junctionModel: "MemberToRole" | "EventMapToMember";
  parentField: "a" | "b";
  parentKey: "id";
  targetField: "a" | "b";
  targetKey: "id";
  targetModel: "Member" | "Role" | "EventMap";
  targetRelation: "eventMap" | "member" | "role";
};

const models = contractJson.domain.namespaces.public.models as DynamicRecord;
const storageTables = contractJson.storage.namespaces.public.entries
  .table as DynamicRecord;

const fieldAliases: Record<string, Record<string, string>> = {
  Reservation: {
    legacyReservationId: "reservationId",
    legacyCreatedDate: "createdDate",
    legacyFromDate: "fromDate",
    legacyToDate: "toDate",
    legacyCreatedByDiscordId: "createdBy",
  },
};

const relationAliases: Record<string, Record<string, RelationAlias>> = {
  Guild: {
    acceptedReservationInvitations: {
      actual: "reservationShareInvitationsReservationShareInvitation",
      target: "ReservationShareInvitation",
    },
    reservationSharesAsFirst: {
      actual: "reservationShares",
      target: "ReservationShare",
    },
    reservationSharesAsSecond: {
      actual: "reservationSharesReservationShare",
      target: "ReservationShare",
    },
    pinnedReservationSpots: {
      actual: "userPinnedReservationSpots",
      target: "UserPinnedReservationSpot",
    },
    guildKillSummary: {
      actual: "guildKillSummaries",
      target: "GuildKillSummary",
    },
    discordChannelSnapshots: {
      actual: "discordGuildChannelSnapshots",
      target: "DiscordGuildChannelSnapshot",
    },
    documents: { actual: "guildDocuments", target: "GuildDocument" },
    documentHistory: {
      actual: "guildDocumentHistories",
      target: "GuildDocumentHistory",
    },
  },
  Member: {
    restoredTimerHistoryEntries: {
      actual: "timerHistoryEntriesTimerHistoryEntry",
      target: "TimerHistoryEntry",
    },
    comments: { actual: "lootComments", target: "LootComment" },
    detectedKills: { actual: "eventHeroKills", target: "EventHeroKill" },
    mapAssignmentHistory: {
      actual: "eventMapAssignmentHistories",
      target: "EventMapAssignmentHistory",
    },
  },
  Timer: {
    member: { actual: "createdBy", target: "Member" },
    actorCharacter: {
      actual: "actorCharacterSnapshot",
      target: "PlayerSnapshot",
    },
  },
  Loot: {
    comments: { actual: "lootComments", target: "LootComment" },
  },
  PlayerSnapshot: {
    timerActorCharacters: { actual: "timers", target: "Timer" },
    restoredTimerHistoryEntries: {
      actual: "timerHistoryEntriesTimerHistoryEntry",
      target: "TimerHistoryEntry",
    },
  },
  TimerHistoryEntry: {
    actorCharacter: {
      actual: "actorCharacterSnapshot",
      target: "PlayerSnapshot",
    },
    timerActorCharacter: {
      actual: "timerActorCharacterSnapshot",
      target: "PlayerSnapshot",
    },
  },
  LootlogConfig: {
    npcs: { actual: "lootlogConfigNpcs", target: "LootlogConfigNpc" },
  },
  NotificationTarget: {
    rules: {
      actual: "notificationRuleTargets",
      target: "NotificationRuleTarget",
    },
    jobs: { actual: "notificationJobs", target: "NotificationJob" },
  },
  NotificationRule: {
    targets: {
      actual: "notificationRuleTargets",
      target: "NotificationRuleTarget",
    },
    jobs: { actual: "notificationJobs", target: "NotificationJob" },
    watchedItems: { actual: "watchedItem", target: "WatchedItem" },
  },
  Event: {
    heroNpcs: { actual: "eventHeroNpcs", target: "EventHeroNpc" },
    rankings: { actual: "eventRankings", target: "EventRanking" },
    pinnedBy: { actual: "userPinnedEvents", target: "UserPinnedEvent" },
  },
  EventMapLocation: {
    maps: { actual: "eventMaps", target: "EventMap" },
  },
  EventMap: {
    presenceLogs: {
      actual: "eventPresenceLogs",
      target: "EventPresenceLog",
    },
    coverageGaps: {
      actual: "eventMapCoverageGaps",
      target: "EventMapCoverageGap",
    },
    assignmentHistory: {
      actual: "eventMapAssignmentHistories",
      target: "EventMapAssignmentHistory",
    },
  },
  EventHeroNpc: {
    kills: { actual: "eventHeroKills", target: "EventHeroKill" },
    maps: { actual: "eventMaps", target: "EventMap" },
    locations: { actual: "eventMapLocations", target: "EventMapLocation" },
    coverageGaps: {
      actual: "eventMapCoverageGaps",
      target: "EventMapCoverageGap",
    },
    assignmentHistory: {
      actual: "eventMapAssignmentHistories",
      target: "EventMapAssignmentHistory",
    },
    windowSummaries: {
      actual: "eventRespawnWindowSummaries",
      target: "EventRespawnWindowSummary",
    },
  },
  EventHeroKill: {
    points: { actual: "eventKillPoints", target: "EventKillPoint" },
    windowSummary: {
      actual: "eventRespawnWindowSummary",
      target: "EventRespawnWindowSummary",
    },
  },
  EventRanking: {
    editHistory: {
      actual: "eventPointsEditHistories",
      target: "EventPointsEditHistory",
    },
  },
  GuildDocument: {
    history: {
      actual: "guildDocumentHistories",
      target: "GuildDocumentHistory",
    },
  },
};

const manyToManyRelations: Record<
  string,
  Record<string, ManyToManyRelation>
> = {
  Member: {
    roles: {
      junctionRelation: "memberToRoles",
      junctionModel: "MemberToRole",
      parentField: "a",
      parentKey: "id",
      targetField: "b",
      targetKey: "id",
      targetModel: "Role",
      targetRelation: "role",
    },
    assignedEventMaps: {
      junctionRelation: "eventMapToMembers",
      junctionModel: "EventMapToMember",
      parentField: "b",
      parentKey: "id",
      targetField: "a",
      targetKey: "id",
      targetModel: "EventMap",
      targetRelation: "eventMap",
    },
  },
  Role: {
    members: {
      junctionRelation: "memberToRoles",
      junctionModel: "MemberToRole",
      parentField: "b",
      parentKey: "id",
      targetField: "a",
      targetKey: "id",
      targetModel: "Member",
      targetRelation: "member",
    },
  },
  EventMap: {
    assignedMembers: {
      junctionRelation: "eventMapToMembers",
      junctionModel: "EventMapToMember",
      parentField: "a",
      parentKey: "id",
      targetField: "b",
      targetKey: "id",
      targetModel: "Member",
      targetRelation: "member",
    },
  },
};

const enumListFields: Record<string, readonly string[]> = {
  LootlogConfigNpc: ["allowedRarities"],
  Role: ["permissions"],
};

const compoundCriterionAliases: Record<string, readonly string[]> = {
  Member: ["memberId"],
  Timer: ["timerId"],
};

function modelMetadata(modelName: string): ModelMetadata {
  return models[modelName] as ModelMetadata;
}

function fieldName(modelName: string, requestedName: string): string {
  const explicit = fieldAliases[modelName]?.[requestedName];
  if (explicit) {
    return explicit;
  }
  if (requestedName === "type" && modelMetadata(modelName).fields._type) {
    return "_type";
  }
  return requestedName;
}

function relationAlias(
  modelName: string,
  requestedName: string,
): RelationAlias {
  const explicit = relationAliases[modelName]?.[requestedName];
  if (explicit) {
    return explicit;
  }

  const relation = modelMetadata(modelName).relations[requestedName];
  return {
    actual: requestedName,
    target: relation?.to?.model ?? "",
  };
}

function temporalInput(modelName: string, requestedName: string, value: Date) {
  const actualName = fieldName(modelName, requestedName);
  const codecId = modelMetadata(modelName).fields[actualName]?.type?.codecId;
  if (codecId === "pg/timestamptz-temporal@1") {
    return Temporal.Instant.fromEpochMilliseconds(value.getTime());
  }
  if (codecId === "pg/timestamp-temporal@1") {
    return Temporal.Instant.fromEpochMilliseconds(value.getTime())
      .toZonedDateTimeISO("UTC")
      .toPlainDateTime();
  }
  return value;
}

function normalizeInput(
  modelName: string,
  requestedName: string,
  value: DynamicValue,
): DynamicValue {
  if (value instanceof Date) {
    return temporalInput(modelName, requestedName, value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeInput(modelName, requestedName, item));
  }
  return value;
}

export function normalizeApiDatabaseValue(value: DynamicValue): DynamicValue {
  if (value instanceof Temporal.Instant) {
    return new Date(value.epochMilliseconds);
  }
  if (value instanceof Temporal.PlainDateTime) {
    return new Date(`${value.toString()}Z`);
  }
  if (value instanceof Temporal.PlainDate) {
    return new Date(`${value.toString()}T00:00:00.000Z`);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeApiDatabaseValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const result: DynamicRecord = {};
  for (const [key, item] of Object.entries(value)) {
    result[key === "_type" ? "type" : key] = normalizeApiDatabaseValue(item);
  }
  return result;
}

const normalizeOutput = normalizeApiDatabaseValue;

function flattenCriterion(
  criterion: DynamicRecord,
  modelName?: string,
): DynamicRecord {
  const result: DynamicRecord = {};
  for (const [key, value] of Object.entries(criterion)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      (key.includes("_") ||
        compoundCriterionAliases[modelName ?? ""]?.includes(key))
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
  rawSql: DynamicSql,
) {
  if (filter === null) {
    return accessor.isNull();
  }
  if (
    typeof filter !== "object" ||
    filter instanceof Date ||
    Array.isArray(filter)
  ) {
    return accessor.eq(normalizeInput(modelName, requestedName, filter));
  }

  const predicates: DynamicValue[] = [];
  const insensitive = filter.mode === "insensitive";
  for (const [operation, operand] of Object.entries(filter)) {
    const normalized = normalizeInput(modelName, requestedName, operand);
    switch (operation) {
      case "equals":
        predicates.push(
          operand === null ? accessor.isNull() : accessor.eq(normalized),
        );
        break;
      case "not":
        if (operand === null) {
          predicates.push(accessor.isNotNull());
        } else if (typeof operand === "object" && !Array.isArray(operand)) {
          predicates.push(
            not(
              scalarPredicate(
                accessor,
                modelName,
                requestedName,
                operand,
                rawSql,
              ),
            ),
          );
        } else {
          predicates.push(accessor.neq(normalized));
        }
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
          accessor[insensitive ? "ilike" : "like"](`%${operand}%`),
        );
        break;
      case "startsWith":
        predicates.push(
          accessor[insensitive ? "ilike" : "like"](`${operand}%`),
        );
        break;
      case "endsWith":
        predicates.push(
          accessor[insensitive ? "ilike" : "like"](`%${operand}`),
        );
        break;
      case "has": {
        const value = param(String(operand), { codecId: "pg/text@1" });
        predicates.push(
          rawSql`${value} = ANY(${accessor}::text[])`
            .returns("pg/bool@1")
            .buildAst(),
        );
        break;
      }
      case "hasSome": {
        const values = Array.isArray(operand) ? operand : [operand];
        predicates.push(
          values.length === 0
            ? rawSql`FALSE`.returns("pg/bool@1").buildAst()
            : or(
                ...values.map((value) =>
                  rawSql`${param(String(value), { codecId: "pg/text@1" })} = ANY(${accessor}::text[])`
                    .returns("pg/bool@1")
                    .buildAst(),
                ),
              ),
        );
        break;
      }
      case "hasEvery": {
        const values = Array.isArray(operand) ? operand : [operand];
        predicates.push(
          values.length === 0
            ? rawSql`TRUE`.returns("pg/bool@1").buildAst()
            : and(
                ...values.map((value) =>
                  rawSql`${param(String(value), { codecId: "pg/text@1" })} = ANY(${accessor}::text[])`
                    .returns("pg/bool@1")
                    .buildAst(),
                ),
              ),
        );
        break;
      }
      case "isEmpty":
        predicates.push(
          operand
            ? rawSql`cardinality(${accessor}) = 0`
                .returns("pg/bool@1")
                .buildAst()
            : rawSql`cardinality(${accessor}) <> 0`
                .returns("pg/bool@1")
                .buildAst(),
        );
        break;
      case "mode":
        break;
      default:
        return accessor.eq(filter);
    }
  }
  return predicates.length === 1 ? predicates[0] : and(...predicates);
}

function logicalWhereExpression(
  proxy: DynamicRecord,
  modelName: string,
  requestedName: string,
  filter: DynamicValue,
  rawSql: DynamicSql,
): DynamicValue | undefined {
  const parts = Array.isArray(filter) ? filter : [filter];
  switch (requestedName) {
    case "AND":
      return and(
        ...parts.map((part) => whereExpression(proxy, modelName, part, rawSql)),
      );
    case "OR":
      return or(
        ...parts.map((part) => whereExpression(proxy, modelName, part, rawSql)),
      );
    case "NOT":
      return not(
        and(
          ...parts.map((part) =>
            whereExpression(proxy, modelName, part, rawSql),
          ),
        ),
      );
    default:
      return undefined;
  }
}

function relationFilterParts(filter: DynamicValue) {
  const relationFilter = filter as DynamicRecord;
  if (relationFilter.some !== undefined) {
    return { method: "some", nested: relationFilter.some };
  }
  if (relationFilter.none !== undefined) {
    return { method: "none", nested: relationFilter.none };
  }
  if (relationFilter.every !== undefined) {
    return { method: "every", nested: relationFilter.every };
  }
  if (relationFilter.is !== undefined) {
    return { method: "some", nested: relationFilter.is };
  }
  if (relationFilter.isNot !== undefined) {
    return { method: "none", nested: relationFilter.isNot };
  }
  return { method: "some", nested: relationFilter };
}

function relationWhereExpression(
  proxy: DynamicRecord,
  modelName: string,
  requestedName: string,
  filter: DynamicValue,
  rawSql: DynamicSql,
): DynamicValue | undefined {
  const manyToManyRelation = manyToManyRelations[modelName]?.[requestedName];
  if (manyToManyRelation) {
    const { method, nested } = relationFilterParts(filter);
    return proxy[manyToManyRelation.junctionRelation][method](
      (junction: DynamicRecord) =>
        junction[manyToManyRelation.targetRelation].some(
          (target: DynamicRecord) =>
            whereExpression(
              target,
              manyToManyRelation.targetModel,
              nested,
              rawSql,
            ),
        ),
    );
  }

  const relation = relationAlias(modelName, requestedName);
  if (!modelMetadata(modelName).relations[relation.actual]) {
    return undefined;
  }
  const { method, nested } = relationFilterParts(filter);
  return proxy[relation.actual][method]((target: DynamicRecord) =>
    whereExpression(target, relation.target, nested, rawSql),
  );
}

function whereExpression(
  proxy: DynamicRecord,
  modelName: string,
  where: DynamicRecord,
  rawSql: DynamicSql,
) {
  const predicates: DynamicValue[] = [];
  for (const [requestedName, filter] of Object.entries(
    flattenCriterion(where, modelName),
  )) {
    if (filter === undefined) {
      continue;
    }
    const logicalExpression = logicalWhereExpression(
      proxy,
      modelName,
      requestedName,
      filter,
      rawSql,
    );
    if (logicalExpression !== undefined) {
      predicates.push(logicalExpression);
      continue;
    }

    const relationExpression = relationWhereExpression(
      proxy,
      modelName,
      requestedName,
      filter,
      rawSql,
    );
    if (relationExpression !== undefined) {
      predicates.push(relationExpression);
      continue;
    }
    predicates.push(
      scalarPredicate(
        proxy[fieldName(modelName, requestedName)],
        modelName,
        requestedName,
        filter,
        rawSql,
      ),
    );
  }
  return predicates.length === 1 ? predicates[0] : and(...predicates);
}

function applyOrderBy(
  collection: DynamicValue,
  modelName: string,
  orderBy: DynamicValue,
) {
  if (!orderBy) {
    return collection;
  }
  const entries = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap(
    (item) => Object.entries(item),
  );
  return collection.orderBy(
    entries.map(
      ([requestedName, direction]) =>
        (proxy: DynamicRecord) =>
          proxy[fieldName(modelName, requestedName)][
            direction as "asc" | "desc"
          ](),
    ),
  );
}

function applyDirectSelections(
  collection: DynamicValue,
  modelName: string,
  args: DynamicRecord,
  rawSql: DynamicSql,
) {
  const selection = args.select as DynamicRecord | undefined;
  const include = args.include as DynamicRecord | undefined;

  const brokenEnumLists = enumListFields[modelName] ?? [];

  if (selection) {
    const scalarFields = Object.entries(selection)
      .filter(
        ([name, selected]) =>
          selected === true &&
          !relationAlias(modelName, name).target &&
          !manyToManyRelations[modelName]?.[name] &&
          !brokenEnumLists.includes(name),
      )
      .map(([name]) => fieldName(modelName, name));
    if (
      brokenEnumLists.some((name) => selection[name]) &&
      !scalarFields.includes("id")
    ) {
      scalarFields.push("id");
    }
    if (scalarFields.length > 0) {
      collection = collection.select(...scalarFields);
    }
  } else if (brokenEnumLists.length > 0) {
    const scalarFields = Object.keys(modelMetadata(modelName).fields).filter(
      (name) => !brokenEnumLists.includes(name),
    );
    collection = collection.select(...scalarFields);
  }

  for (const [requestedName, relationArgs] of Object.entries({
    ...(include ?? {}),
    ...(selection ?? {}),
  })) {
    if (!relationArgs || relationArgs === false) {
      continue;
    }
    if (manyToManyRelations[modelName]?.[requestedName]) {
      continue;
    }
    const relation = relationAlias(modelName, requestedName);
    if (!relation.target) {
      continue;
    }
    collection = collection.include(
      relation.actual,
      relationArgs === true
        ? undefined
        : (branch: DynamicValue) =>
            applyCollectionArgs(
              branch,
              relation.target,
              relationArgs,
              rawSql,
              false,
            ),
    );
  }
  return collection;
}

function rawTemplate(parts: readonly string[]): TemplateStringsArray {
  const strings = [...parts] as unknown as TemplateStringsArray & {
    raw: readonly string[];
  };
  Object.defineProperty(strings, "raw", { value: [...parts] });
  return strings;
}

async function hydrateEnumLists(
  context: ClientContext,
  modelName: string,
  rows: DynamicRecord[],
  args: DynamicRecord,
) {
  const fields = (enumListFields[modelName] ?? []).filter(
    (name) => !args.select || args.select[name],
  );
  if (fields.length === 0 || rows.length === 0) {
    return;
  }

  const tableName = modelMetadata(modelName).storage.table;
  await Promise.all(
    rows.map(async (row) => {
      const projections = fields
        .map((name) => `"${name}"::text[] AS "${name}"`)
        .join(", ");
      const plan = context.raw
        .sql(
          rawTemplate([
            `SELECT ${projections} FROM "${tableName}" WHERE "id" = `,
            "",
          ]),
          row.id,
        )
        .returnsRow(
          Object.fromEntries(fields.map((name) => [name, "pg/text-array@1"])),
        )
        .build();
      const [enumValues] = await context.query(plan);
      Object.assign(row, enumValues);
      if (args.select && !args.select.id) {
        delete row.id;
      }
    }),
  );
}

function applyCollectionArgs(
  collection: DynamicValue,
  modelName: string,
  args: DynamicRecord = {},
  rawSql: DynamicSql,
  applyWhere = true,
) {
  if (applyWhere && args.where) {
    collection = collection.where((proxy: DynamicRecord) =>
      whereExpression(proxy, modelName, args.where, rawSql),
    );
  }
  collection = applyOrderBy(collection, modelName, args.orderBy);
  collection = applyDirectSelections(collection, modelName, args, rawSql);
  if (args.distinct) {
    const fields = Array.isArray(args.distinct)
      ? args.distinct
      : [args.distinct];
    collection = collection.distinct(
      ...fields.map((name: string) => fieldName(modelName, name)),
    );
  }
  if (typeof args.skip === "number") {
    collection = collection.offset(args.skip);
  }
  if (typeof args.take === "number") {
    collection = collection.limit(Math.abs(args.take));
  }
  return collection;
}

function nestedRelationArgs(args: DynamicRecord, relationName: string) {
  const selected = args.select?.[relationName];
  return selected ?? args.include?.[relationName];
}

async function hydrateManyToMany(
  context: ClientContext,
  modelName: string,
  rows: DynamicRecord[],
  args: DynamicRecord,
) {
  for (const [relationName, relation] of Object.entries(
    manyToManyRelations[modelName] ?? {},
  )) {
    const relationArgs = nestedRelationArgs(args, relationName);
    if (!relationArgs) {
      continue;
    }
    const parentIds = rows.map((row) => row[relation.parentKey]);
    let junctionCollection = context.native.orm.public[relation.junctionModel];
    junctionCollection = junctionCollection.where((proxy: DynamicRecord) =>
      proxy[relation.parentField].in(parentIds),
    );
    const junctions = await junctionCollection.all();
    const targetIds = junctions.map(
      (junction: DynamicRecord) => junction[relation.targetField],
    );
    let targetCollection = context.native.orm.public[relation.targetModel];
    targetCollection = targetCollection.where((proxy: DynamicRecord) =>
      proxy[relation.targetKey].in(targetIds),
    );
    targetCollection = applyCollectionArgs(
      targetCollection,
      relation.targetModel,
      relationArgs === true ? {} : relationArgs,
      context.raw.sql,
      false,
    );
    const targets = await targetCollection.all();
    const targetsById = new Map(
      targets.map((target: DynamicRecord) => [
        target[relation.targetKey],
        target,
      ]),
    );
    for (const row of rows) {
      const ids = junctions
        .filter(
          (junction: DynamicRecord) =>
            junction[relation.parentField] === row[relation.parentKey],
        )
        .map((junction: DynamicRecord) => junction[relation.targetField]);
      row[relationName] = ids
        .map((id: DynamicValue) => targetsById.get(id))
        .filter(Boolean);
    }
    await hydrateRows(
      context,
      relation.targetModel,
      targets,
      relationArgs === true ? {} : relationArgs,
    );
  }
}

async function hydrateRelationCounts(
  context: ClientContext,
  modelName: string,
  rows: DynamicRecord[],
  args: DynamicRecord,
) {
  const countSelection = args.select?._count ?? args.include?._count;
  if (!countSelection) {
    return;
  }
  const requestedRelations =
    countSelection === true
      ? [
          ...Object.keys(modelMetadata(modelName).relations),
          ...Object.keys(manyToManyRelations[modelName] ?? {}),
        ]
      : Object.entries(countSelection.select ?? {})
          .filter(([, selected]) => selected)
          .map(([name]) => name);

  await Promise.all(
    rows.map(async (row) => {
      const counts: DynamicRecord = {};
      for (const requestedName of requestedRelations) {
        const manyToMany = manyToManyRelations[modelName]?.[requestedName];
        if (manyToMany) {
          counts[requestedName] = await context.native.orm.public[
            manyToMany.junctionModel
          ]
            .where((proxy: DynamicRecord) =>
              proxy[manyToMany.parentField].eq(row[manyToMany.parentKey]),
            )
            .count();
          continue;
        }

        const relation = relationAlias(modelName, requestedName);
        const metadata = modelMetadata(modelName).relations[relation.actual];
        if (!metadata) {
          continue;
        }
        const target = new ApplicationModelDelegate(context, relation.target);
        counts[requestedName] = await target.count({
          where: Object.fromEntries(
            metadata.on.targetFields.map(
              (targetField: string, index: number) => [
                targetField,
                row[metadata.on.localFields[index]],
              ],
            ),
          ),
        });
      }
      row._count = counts;
    }),
  );
}

async function hydrateRows(
  context: ClientContext,
  modelName: string,
  rows: DynamicRecord[],
  args: DynamicRecord,
) {
  for (const row of rows) {
    for (const [requestedName, actualName] of Object.entries(
      fieldAliases[modelName] ?? {},
    )) {
      if (actualName in row) {
        row[requestedName] = row[actualName];
        delete row[actualName];
      }
    }
  }
  await hydrateEnumLists(context, modelName, rows, args);
  for (const [requestedName, relationArgs] of Object.entries({
    ...(args.include ?? {}),
    ...(args.select ?? {}),
  })) {
    if (!relationArgs || relationArgs === false) {
      continue;
    }
    const relation = relationAlias(modelName, requestedName);
    if (!relation.target || manyToManyRelations[modelName]?.[requestedName]) {
      continue;
    }
    const relatedRows: DynamicRecord[] = [];
    for (const row of rows) {
      const value = row[relation.actual];
      if (relation.actual !== requestedName) {
        row[requestedName] = value;
        delete row[relation.actual];
      }
      if (Array.isArray(value)) {
        relatedRows.push(...value);
      } else if (value) {
        relatedRows.push(value);
      }
    }
    await hydrateRows(
      context,
      relation.target,
      relatedRows,
      relationArgs === true ? {} : relationArgs,
    );
  }
  await hydrateManyToMany(context, modelName, rows, args);
  await hydrateRelationCounts(context, modelName, rows, args);
  return rows.map(normalizeOutput);
}

function isConstraintViolation(error: unknown, sqlState = "23505"): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { sqlState?: string; cause?: unknown };
  return (
    candidate.sqlState === sqlState ||
    (candidate.cause !== error &&
      isConstraintViolation(candidate.cause, sqlState))
  );
}

function noRowsError(modelName: string) {
  return Object.assign(new Error(`${modelName} record was not found`), {
    code: "RUNTIME.NO_ROWS",
  });
}

async function prepareMutationData(
  context: ClientContext,
  modelName: string,
  data: DynamicRecord,
) {
  const result: DynamicRecord = {};
  for (const [requestedName, value] of Object.entries(data)) {
    if (
      value === undefined ||
      manyToManyRelations[modelName]?.[requestedName] ||
      enumListFields[modelName]?.includes(requestedName)
    ) {
      continue;
    }
    const relation = relationAlias(modelName, requestedName);
    if (relation.target) {
      const relationMetadata =
        modelMetadata(modelName).relations[relation.actual];
      if (relationMetadata.cardinality === "1:N") {
        continue;
      }
      const mutation = value as DynamicRecord;
      if (mutation.connectOrCreate) {
        const entry = mutation.connectOrCreate;
        const target = new ApplicationModelDelegate(context, relation.target);
        const existing = await target.findUnique({ where: entry.where });
        result[relation.actual] = (mutator: DynamicRecord) =>
          existing
            ? mutator.connect(flattenCriterion(entry.where, relation.target))
            : mutator.create(entry.create);
        continue;
      }
      result[relation.actual] = (mutator: DynamicRecord) => {
        if (mutation.createMany) {
          return mutator.create(mutation.createMany.data);
        }
        if (mutation.create) {
          return mutator.create(mutation.create);
        }
        if (mutation.connect) {
          return mutator.connect(
            Array.isArray(mutation.connect)
              ? mutation.connect.map((criterion: DynamicRecord) =>
                  flattenCriterion(criterion, relation.target),
                )
              : flattenCriterion(mutation.connect, relation.target),
          );
        }
        if (mutation.disconnect === true) {
          return mutator.disconnect();
        }
        if (mutation.disconnect) {
          const criteria = Array.isArray(mutation.disconnect)
            ? mutation.disconnect
            : [mutation.disconnect];
          return mutator.disconnect(
            criteria.map((criterion: DynamicRecord) =>
              flattenCriterion(criterion, relation.target),
            ),
          );
        }
        throw new Error(
          `Unsupported nested mutation for ${modelName}.${requestedName}`,
        );
      };
      continue;
    }
    const actualName = fieldName(modelName, requestedName);
    result[actualName] = normalizeInput(modelName, requestedName, value);
  }
  return result;
}

function relationChildData(
  modelName: string,
  relationName: string,
  parent: DynamicRecord,
  data: DynamicRecord,
) {
  const relation = modelMetadata(modelName).relations[relationName];
  return {
    ...data,
    ...Object.fromEntries(
      relation.on.targetFields.map((targetField: string, index: number) => [
        targetField,
        parent[relation.on.localFields[index]],
      ]),
    ),
  };
}

function nestedEntries(value: DynamicValue): DynamicValue[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function applyNestedToManyMutations(
  context: ClientContext,
  modelName: string,
  parent: DynamicRecord,
  data: DynamicRecord,
) {
  for (const [requestedName, requestedMutation] of Object.entries(data)) {
    const relation = relationAlias(modelName, requestedName);
    if (!relation.target) {
      continue;
    }
    const relationMetadata =
      modelMetadata(modelName).relations[relation.actual];
    if (relationMetadata.cardinality !== "1:N") {
      continue;
    }

    const mutation = requestedMutation as DynamicRecord;
    const child = new ApplicationModelDelegate(context, relation.target);
    const childData = (entry: DynamicRecord) =>
      relationChildData(modelName, relation.actual, parent, entry);
    const parentWhere = relationChildData(
      modelName,
      relation.actual,
      parent,
      {},
    );

    for (const entry of nestedEntries(mutation.create)) {
      await child.create({ data: childData(entry) });
    }
    if (mutation.createMany) {
      await child.createMany({
        data: nestedEntries(mutation.createMany.data).map(childData),
        skipDuplicates: mutation.createMany.skipDuplicates,
      });
    }
    for (const entry of nestedEntries(mutation.update)) {
      await child.update({
        where: { ...parentWhere, ...entry.where },
        data: entry.data,
      });
    }
    for (const entry of nestedEntries(mutation.updateMany)) {
      await child.updateMany({
        where: { ...parentWhere, ...entry.where },
        data: entry.data,
      });
    }
    for (const entry of nestedEntries(mutation.upsert)) {
      await child.upsert({
        where: { ...parentWhere, ...entry.where },
        create: childData(entry.create),
        update: entry.update,
      });
    }
    for (const criterion of nestedEntries(mutation.delete)) {
      await child.delete({ where: { ...parentWhere, ...criterion } });
    }
    for (const criterion of nestedEntries(mutation.deleteMany)) {
      await child.deleteMany({
        where: { ...parentWhere, ...(criterion === true ? {} : criterion) },
      });
    }
    for (const criterion of nestedEntries(mutation.connect)) {
      await child.updateMany({
        where: criterion,
        data: parentWhere,
      });
    }
  }
}

function mutationResultCriterion(
  modelName: string,
  row: DynamicRecord,
  data: DynamicRecord,
) {
  if (modelMetadata(modelName).fields.id && row.id !== undefined) {
    return { id: row.id };
  }
  return Object.fromEntries(
    Object.keys(data)
      .filter(
        (name) =>
          modelMetadata(modelName).fields[fieldName(modelName, name)] &&
          row[fieldName(modelName, name)] !== undefined,
      )
      .map((name) => [name, row[fieldName(modelName, name)]]),
  );
}

async function applyEnumListMutation(
  context: ClientContext,
  modelName: string,
  row: DynamicRecord,
  data: DynamicRecord,
) {
  const fields = (enumListFields[modelName] ?? []).filter(
    (name) => data[name] !== undefined,
  );
  if (fields.length === 0) {
    return;
  }
  const model = modelMetadata(modelName);
  if (!model.fields.id) {
    throw new Error(`Enum-list mutation requires an id field on ${modelName}`);
  }
  const { column: idColumn, columnName: idColumnName } = storageColumn(
    modelName,
    "id",
  );

  for (const requestedName of fields) {
    const { column, columnName } = storageColumn(modelName, requestedName);
    const typeName = String(
      column.valueSet?.entityName ?? column.nativeType,
    ).replaceAll('"', '""');
    const requestedValue = data[requestedName];
    const value =
      requestedValue &&
      typeof requestedValue === "object" &&
      !Array.isArray(requestedValue) &&
      "set" in requestedValue
        ? requestedValue.set
        : requestedValue;
    const plan = context.raw
      .sql(
        rawTemplate([
          `UPDATE "${model.storage.table}" SET "${columnName}" = `,
          `::text[]::"${typeName}"[] WHERE "${idColumnName}" = `,
          ` RETURNING "${idColumnName}"`,
        ]),
        param(value, { codecId: "pg/text-array@1" }),
        param(row.id, { codecId: idColumn.codecId }),
      )
      .returnsRow({ [idColumnName]: idColumn.codecId })
      .build();
    await context.query(plan);
  }
}

function withUpdatedAt(modelName: string, data: DynamicRecord): DynamicRecord {
  if (!modelMetadata(modelName).fields.updatedAt) {
    return data;
  }
  return { ...data, updatedAt: new Date() };
}

async function applyManyToManyMutation(
  context: ClientContext,
  modelName: string,
  parent: DynamicRecord,
  data: DynamicRecord,
) {
  for (const [relationName, relation] of Object.entries(
    manyToManyRelations[modelName] ?? {},
  )) {
    const mutation = data[relationName];
    if (!mutation) {
      continue;
    }
    const parentId = parent[relation.parentKey];
    const junction = context.native.orm.public[relation.junctionModel];
    if (mutation.set) {
      await junction
        .where((proxy: DynamicRecord) =>
          proxy[relation.parentField].eq(parentId),
        )
        .deleteAndCount();
    }
    const connects = [
      ...(Array.isArray(mutation.set)
        ? mutation.set
        : mutation.set
          ? [mutation.set]
          : []),
      ...(Array.isArray(mutation.connect)
        ? mutation.connect
        : mutation.connect
          ? [mutation.connect]
          : []),
    ];
    for (const criterion of connects) {
      const targetId = flattenCriterion(criterion, relation.targetModel)[
        relation.targetKey
      ];
      await junction.upsert({
        create: {
          [relation.parentField]: parentId,
          [relation.targetField]: targetId,
        },
        update: {},
        conflictOn: {
          [relation.parentField]: parentId,
          [relation.targetField]: targetId,
        },
      });
    }
    if (mutation.disconnect) {
      const disconnects = Array.isArray(mutation.disconnect)
        ? mutation.disconnect
        : [mutation.disconnect];
      const targetIds = disconnects.map(
        (criterion: DynamicRecord) =>
          flattenCriterion(criterion, relation.targetModel)[relation.targetKey],
      );
      await junction
        .where((proxy: DynamicRecord) =>
          and(
            proxy[relation.parentField].eq(parentId),
            proxy[relation.targetField].in(targetIds),
          ),
        )
        .deleteAndCount();
    }
  }
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
  const codecId = modelMetadata(modelName).fields[actualName]?.type?.codecId;
  if (!numericCodecIds.has(codecId)) {
    return undefined;
  }
  for (const [operation, operator] of Object.entries(atomicOperators)) {
    if (operation in value) {
      return {
        operand: value[operation],
        operator,
      };
    }
  }
  return undefined;
}

function hasAtomicUpdates(modelName: string, data: DynamicRecord) {
  return Object.entries(data).some(([name, value]) =>
    atomicUpdate(modelName, name, value),
  );
}

function storageColumn(modelName: string, requestedName: string) {
  const actualName = fieldName(modelName, requestedName);
  const model = modelMetadata(modelName);
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

  const normalized = normalizeInput(modelName, requestedName, value);
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
  for (const requestedName of Object.keys(data)) {
    if (
      manyToManyRelations[modelName]?.[requestedName] ||
      enumListFields[modelName]?.includes(requestedName) ||
      relationAlias(modelName, requestedName).target
    ) {
      throw new Error(
        `Atomic updates cannot include relation ${modelName}.${requestedName}`,
      );
    }
  }

  const atomicField = Object.entries(data).find(([name, value]) =>
    atomicUpdate(modelName, name, value),
  );
  if (!atomicField) {
    return false;
  }

  const model = modelMetadata(modelName);
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
    const predicates = Object.entries(flattenCriterion(where, modelName)).map(
      ([requestedName, value]) => {
        const { columnName } = storageColumn(modelName, requestedName);
        return functions.eq(
          fields[columnName],
          normalizeInput(modelName, requestedName, value),
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

class ApplicationModelDelegate {
  constructor(
    private readonly context: ClientContext,
    private readonly modelName: string,
  ) {}

  private collection() {
    return this.context.native.orm.public[this.modelName];
  }

  private async queryCollection(args: DynamicRecord = {}) {
    let collection = this.collection();
    collection = applyCollectionArgs(
      collection,
      this.modelName,
      args,
      this.context.raw.sql,
    );
    return collection;
  }

  async findMany(args: DynamicRecord = {}) {
    const rows = await (await this.queryCollection(args)).all();
    return hydrateRows(this.context, this.modelName, rows, args);
  }

  async findFirst(args: DynamicRecord = {}) {
    const row = await (await this.queryCollection(args)).first();
    if (!row) {
      return null;
    }
    return (await hydrateRows(this.context, this.modelName, [row], args))[0];
  }

  async findFirstOrThrow(args: DynamicRecord = {}) {
    const row = await this.findFirst(args);
    if (!row) {
      throw noRowsError(this.modelName);
    }
    return row;
  }

  findUnique(args: DynamicRecord) {
    return this.findFirst(args);
  }

  findUniqueOrThrow(args: DynamicRecord) {
    return this.findFirstOrThrow(args);
  }

  async create(args: DynamicRecord) {
    const data = await prepareMutationData(
      this.context,
      this.modelName,
      withUpdatedAt(this.modelName, args.data),
    );
    const collection = applyDirectSelections(
      this.collection(),
      this.modelName,
      {},
      this.context.raw.sql,
    );
    const row = await collection.create(data);
    await applyEnumListMutation(this.context, this.modelName, row, args.data);
    await applyManyToManyMutation(this.context, this.modelName, row, args.data);
    await applyNestedToManyMutations(
      this.context,
      this.modelName,
      row,
      args.data,
    );
    return this.findFirstOrThrow({
      where: mutationResultCriterion(this.modelName, row, args.data),
      select: args.select,
      include: args.include,
    });
  }

  async createMany(args: DynamicRecord) {
    const entries = Array.isArray(args.data) ? args.data : [args.data];
    let count = 0;
    for (const data of entries) {
      try {
        await this.create({ data });
        count += 1;
      } catch (error) {
        if (!args.skipDuplicates || !isConstraintViolation(error)) {
          throw error;
        }
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
        throw noRowsError(this.modelName);
      }
      return this.findFirstOrThrow({
        where: args.where,
        select: args.select,
        include: args.include,
      });
    }
    const resolvedData = withUpdatedAt(this.modelName, args.data);
    const data = await prepareMutationData(
      this.context,
      this.modelName,
      resolvedData,
    );
    const collection = await this.queryCollection({ where: args.where });
    const row = await collection.update(data);
    if (!row) {
      throw noRowsError(this.modelName);
    }
    await applyEnumListMutation(this.context, this.modelName, row, args.data);
    await applyManyToManyMutation(this.context, this.modelName, row, args.data);
    await applyNestedToManyMutations(
      this.context,
      this.modelName,
      row,
      args.data,
    );
    return this.findFirstOrThrow({
      where: args.where,
      select: args.select,
      include: args.include,
    });
  }

  async updateMany(args: DynamicRecord) {
    const existing = await this.findMany({ where: args.where });
    let count = 0;
    for (const row of existing) {
      const metadata = modelMetadata(this.modelName);
      const identifier = metadata.fields.id
        ? { id: row.id }
        : Object.fromEntries(
            Object.keys(flattenCriterion(args.where ?? {}, this.modelName)).map(
              (key) => [key, row[key]],
            ),
          );
      await this.update({ where: identifier, data: args.data });
      count += 1;
    }
    return { count };
  }

  async upsert(args: DynamicRecord) {
    const criterion = flattenCriterion(args.where, this.modelName);
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
        if (!isConstraintViolation(error)) {
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

    const fetchExisting = () =>
      this.findFirstOrThrow({
        where: criterion,
        select: args.select,
        include: args.include,
      });
    if (await this.findFirst({ where: criterion })) {
      if (Object.keys(args.update).length === 0) {
        return fetchExisting();
      }
      return this.update({
        where: criterion,
        data: args.update,
        select: args.select,
        include: args.include,
      });
    }
    try {
      return await this.create({
        data: args.create,
        select: args.select,
        include: args.include,
      });
    } catch (error) {
      if (!isConstraintViolation(error)) {
        throw error;
      }
      if (Object.keys(args.update).length === 0) {
        return fetchExisting();
      }
      return this.update({
        where: criterion,
        data: args.update,
        select: args.select,
        include: args.include,
      });
    }
  }

  async delete(args: DynamicRecord) {
    const collection = await this.queryCollection({ where: args.where });
    const row = await collection.delete();
    if (!row) {
      throw noRowsError(this.modelName);
    }
    return normalizeOutput(row);
  }

  async deleteMany(args: DynamicRecord = {}) {
    const collection = await this.queryCollection(args);
    return { count: await collection.deleteAndCount() };
  }

  async count(args: DynamicRecord = {}) {
    const collection = await this.queryCollection(args);
    const result = await collection.aggregate((aggregate: DynamicRecord) => ({
      count: aggregate.count(),
    }));
    return result.count;
  }

  async aggregate(args: DynamicRecord) {
    const collection = await this.queryCollection(args);
    const result = await collection.aggregate((aggregate: DynamicRecord) => {
      const spec: DynamicRecord = {};
      for (const [operation, selection] of Object.entries(args)) {
        if (!operation.startsWith("_")) {
          continue;
        }
        for (const [field, enabled] of Object.entries(
          selection as DynamicRecord,
        )) {
          if (enabled) {
            spec[`${operation}_${field}`] =
              operation === "_count" && field === "_all"
                ? aggregate.count()
                : aggregate[operation.slice(1)](
                    fieldName(this.modelName, field),
                  );
          }
        }
      }
      return spec;
    });
    const shaped: DynamicRecord = {};
    for (const [key, value] of Object.entries(result)) {
      const separator = key.indexOf("_", 1);
      const operation = key.slice(0, separator);
      const field = key.slice(separator + 1);
      shaped[operation] ??= {};
      shaped[operation][field] = value;
    }
    return normalizeOutput(shaped);
  }

  async groupBy(args: DynamicRecord) {
    let collection = await this.queryCollection(args);
    const by = args.by.map((name: string) => fieldName(this.modelName, name));
    collection = collection.groupBy(...by);
    const result = await collection.aggregate((aggregate: DynamicRecord) => {
      const spec: DynamicRecord = {};
      for (const operation of ["_count", "_sum", "_avg", "_min", "_max"]) {
        const selection = args[operation];
        if (!selection) {
          continue;
        }
        if (selection === true) {
          spec[`${operation}__all`] = aggregate[operation.slice(1)]();
          continue;
        }
        for (const [field, enabled] of Object.entries(selection)) {
          if (enabled) {
            spec[`${operation}_${field}`] =
              operation === "_count" && field === "_all"
                ? aggregate.count()
                : aggregate[operation.slice(1)](
                    fieldName(this.modelName, field),
                  );
          }
        }
      }
      return spec;
    });
    return result.map((row: DynamicRecord) => {
      const shaped: DynamicRecord = {};
      for (const name of args.by) {
        shaped[name] = row[fieldName(this.modelName, name)];
      }
      for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith("_")) {
          continue;
        }
        const separator = key.indexOf("_", 1);
        const operation = key.slice(0, separator);
        const field = key.slice(separator + 1);
        shaped[operation] ??= {};
        shaped[operation][field] = value;
      }
      return normalizeOutput(shaped);
    });
  }
}

function createApplicationOrm(context: ClientContext): ApiApplicationOrm {
  return {
    public: Object.fromEntries(
      Object.keys(models).map((modelName) => [
        modelName,
        new ApplicationModelDelegate(context, modelName),
      ]),
    ),
  } as unknown as ApiApplicationOrm;
}

export function createApiApplicationDatabase(
  nativeDatabase: ApiDatabase,
): ApiApplicationDatabase {
  const native = nativeDatabase as DynamicRecord;
  const context: ClientContext = {
    native,
    raw: native.raw,
    sql: native.sql,
    query: async (plan) => (await native.runtime()).query(plan),
  };
  return {
    ...nativeDatabase,
    orm: createApplicationOrm(context),
    transaction: (callback, options) =>
      nativeDatabase.transaction(async (nativeTransaction) => {
        if (options?.isolationLevel === "Serializable") {
          const plan = native.raw
            .sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
            .affectedCount()
            .build();
          await (nativeTransaction as unknown as DynamicRecord).execute(plan);
        }
        const transactionContext: ClientContext = {
          native: nativeTransaction as DynamicRecord,
          raw: native.raw,
          sql: native.sql,
          query: (plan) =>
            (nativeTransaction as unknown as DynamicRecord).query(plan),
        };
        const transaction = {
          ...nativeTransaction,
          orm: createApplicationOrm(transactionContext),
        } as ApiApplicationTransaction;
        return callback(transaction);
      }),
  };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isConstraintViolation(error, "23505");
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return isConstraintViolation(error, "23503");
}

export function isRecordNotFoundError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "RUNTIME.NO_ROWS"
  );
}
