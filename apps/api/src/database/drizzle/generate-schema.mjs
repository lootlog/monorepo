import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const legacyPrismaSchemaUrl = new URL(
  "../../../drizzle/legacy-prisma/schema.prisma",
  import.meta.url,
);
const outputUrl = new URL("./schema.ts", import.meta.url);
const catalogOutputUrl = new URL("./expected-catalog.ts", import.meta.url);
const legacyManifestUrl = new URL(
  "../../../drizzle/legacy-prisma.sha256",
  import.meta.url,
);
const baselineMigrationUrl = new URL(
  "../../../drizzle/migrations/20260901121000_legacy_prisma_baseline/migration.sql",
  import.meta.url,
);
const source = await readFile(legacyPrismaSchemaUrl, "utf8");

const block = (kind) =>
  [
    ...source.matchAll(
      new RegExp(`${kind}\\s+(\\w+)\\s+\\{([\\s\\S]*?)\\n\\}`, "g"),
    ),
  ].map(([, name, body]) => ({ name, body }));

const enumBlocks = block("enum");
const modelBlocks = block("model");
const enumNames = new Set(enumBlocks.map(({ name }) => name));
const modelNames = new Set(modelBlocks.map(({ name }) => name));
const legacyNullableColumns = new Set([
  "DiscordGuildChannelSnapshot.grantedPermissions",
  "DiscordGuildChannelSnapshot.missingPermissions",
  "DiscordGuildChannelSnapshot.requiredPermissions",
  "DiscordGuildSyncState.grantedPermissions",
  "DiscordGuildSyncState.missingPermissions",
  "DiscordGuildSyncState.requiredPermissions",
  "LootlogConfigNpc.allowedRarities",
  "Role.permissions",
  "UserGuildTimerSettings.hiddenTimers",
  "UserGuildTimerSettings.pinnedTimers",
  "UserSettings.guildsOrder",
]);
const parseEnumValues = (body) =>
  body
    .split("\n")
    .map(
      (line) =>
        line
          .replace(/\/\/.*$/, "")
          .trim()
          .split(/\s+/)[0],
    )
    .filter((line) => /^[A-Z][A-Z0-9_]*$/.test(line));
const deployedPermissionValues = parseEnumValues(
  enumBlocks.find(({ name }) => name === "Permission").body,
)
  .filter(
    (value) =>
      value !== "LOOTLOG_LOOTS_ARCHIVE" &&
      value !== "LOOTLOG_PRESENCE_LOCATION_READ" &&
      value !== "LOOTLOG_ONLINE_PLAYERS_READ" &&
      value !== "LOOTLOG_DOCS_READ" &&
      value !== "LOOTLOG_DOCS_WRITE",
  )
  .concat(
    "LOOTLOG_ONLINE_PLAYERS_READ",
    "LOOTLOG_DOCS_READ",
    "LOOTLOG_DOCS_WRITE",
    "LOOTLOG_LOOTS_ARCHIVE",
  );
const enumValues = ({ name, body }, includePresenceLocation) =>
  name === "Permission"
    ? deployedPermissionValues.concat(
        includePresenceLocation ? "LOOTLOG_PRESENCE_LOCATION_READ" : [],
      )
    : parseEnumValues(body);
const lowerFirst = (value) => value[0].toLowerCase() + value.slice(1);
const tableSymbol = (modelName) => `${lowerFirst(modelName)}Table`;
const quote = JSON.stringify;
const legacyIndexNames = new Map([
  [
    "NotificationTarget:ownerType,ownerId,provider,targetType,externalId",
    "NotificationTarget_ownerType_ownerId_provider_targetType_ex_key",
  ],
]);
const indexName = (tableName, fields, kind, mappedName) =>
  mappedName ??
  legacyIndexNames.get(`${tableName}:${fields.join(",")}`) ??
  `${tableName}_${fields.join("_")}_${kind === "unique" ? "key" : "idx"}`;
const splitArguments = (value) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === ")") depth -= 1;
    if (value[index] === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
};

const parseDefault = (attributes, type, isList) => {
  const match = attributes.match(
    /@default\((\w+\(\)|"(?:[^"\\]|\\.)*"|[^)]+)\)/,
  );
  if (!match) return "";
  const value = match[1];
  if (value === "autoincrement()" || value === "cuid()" || value === "uuid()")
    return "";
  if (value === "now()") return ".defaultNow()";
  if (value === "[]") {
    const cast = enumNames.has(type)
      ? `"${type}"[]`
      : type === "String"
        ? "text[]"
        : undefined;
    return cast ? ".default(sql`'{}'::" + cast + "`)" : "";
  }
  if (type === "Json") {
    const json = value.startsWith('"') ? JSON.parse(value) : value;
    return ".default(sql`'" + json.replaceAll("'", "''") + "'::jsonb`)";
  }
  if (value === "true" || value === "false" || /^-?\d+(?:\.\d+)?$/.test(value))
    return `.default(${value})`;
  if (value.startsWith('"')) return `.default(${value})`;
  if (enumNames.has(type)) return `.default(${quote(value)})`;
  if (isList) return "";
  return "";
};

const columnBuilder = ({ columnName, type, optional, list, attributes }) => {
  const autoIncrement = attributes.includes("@default(autoincrement())");
  let expression;
  if (type === "String")
    expression = list
      ? `text(${quote(columnName)}).array()`
      : `text(${quote(columnName)})`;
  else if (type === "Int")
    expression = autoIncrement
      ? `serial(${quote(columnName)})`
      : `integer(${quote(columnName)})`;
  else if (type === "Float")
    expression = `doublePrecision(${quote(columnName)})`;
  else if (type === "Boolean") expression = `boolean(${quote(columnName)})`;
  else if (type === "DateTime")
    expression = `timestamp(${quote(columnName)}, { mode: "date", precision: 3 })`;
  else if (type === "Json") expression = `jsonb(${quote(columnName)})`;
  else if (type === "BigInt")
    expression = `bigint(${quote(columnName)}, { mode: "bigint" })`;
  else if (type === "Decimal") expression = `numeric(${quote(columnName)})`;
  else if (type === "Bytes") expression = `bytea(${quote(columnName)})`;
  else if (enumNames.has(type))
    expression = `${lowerFirst(type)}Enum(${quote(columnName)})${list ? ".array()" : ""}`;
  else throw new Error(`Unsupported Prisma scalar ${type}`);

  expression += parseDefault(attributes, type, list);
  if (!optional) expression += ".notNull()";
  if (attributes.includes("@id")) expression += ".primaryKey()";
  return expression;
};

const parseModel = ({ name, body }) => {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const fields = [];
  const relations = [];
  const declarations = [];
  let tableName = name;

  for (const line of lines) {
    const tableMap = line.match(/^@@map\("([^"]+)"\)/);
    if (tableMap) {
      tableName = tableMap[1];
      continue;
    }
    if (line.startsWith("@@")) {
      declarations.push(line);
      continue;
    }
    const match = line.match(/^(\w+)\s+([\w]+)(\[\])?(\?)?\s*(.*)$/);
    if (!match) continue;
    const [, fieldName, type, listToken, optionalToken, attributes] = match;
    if (modelNames.has(type)) {
      if (attributes.includes("@relation") && attributes.includes("fields:")) {
        relations.push({ target: type, attributes });
      }
      continue;
    }
    const mapped = attributes.match(/@map\("([^"]+)"\)/)?.[1] ?? fieldName;
    fields.push({
      fieldName,
      columnName: mapped,
      type,
      list: listToken === "[]",
      optional: optionalToken === "?",
      attributes,
    });
  }
  return { name, tableName, fields, relations, declarations };
};

const models = modelBlocks.map(parseModel);
const formatType = ({ type, list }) => {
  let formatted;
  if (type === "String") formatted = "text";
  else if (type === "Int") formatted = "integer";
  else if (type === "Float") formatted = "double precision";
  else if (type === "Boolean") formatted = "boolean";
  else if (type === "DateTime") formatted = "timestamp(3) without time zone";
  else if (type === "Json") formatted = "jsonb";
  else if (type === "BigInt") formatted = "bigint";
  else if (type === "Decimal") formatted = "numeric";
  else if (type === "Bytes") formatted = "bytea";
  else if (enumNames.has(type)) formatted = `"${type}"`;
  else throw new Error(`Unsupported catalog type ${type}`);
  return list ? `${formatted}[]` : formatted;
};

const hasDatabaseDefault = ({ attributes }) => {
  const match = attributes.match(
    /@default\((\w+\(\)|"(?:[^"\\]|\\.)*"|[^)]+)\)/,
  );
  if (!match) return false;
  return match[1] !== "cuid()" && match[1] !== "uuid()";
};

const catalog = {
  tables: models
    .map(({ tableName }) => tableName)
    .concat("_MemberToRole", "_EventMapToMember")
    .sort(),
  columns: models
    .flatMap((model) =>
      model.fields.map((field) => ({
        tableName: model.tableName,
        columnName: field.columnName,
        formattedType: formatType(field),
        isNullable:
          field.optional ||
          legacyNullableColumns.has(`${model.tableName}.${field.columnName}`),
        hasDefault: hasDatabaseDefault(field),
      })),
    )
    .concat([
      {
        tableName: "_MemberToRole",
        columnName: "A",
        formattedType: "integer",
        isNullable: false,
        hasDefault: false,
      },
      {
        tableName: "_MemberToRole",
        columnName: "B",
        formattedType: "text",
        isNullable: false,
        hasDefault: false,
      },
      {
        tableName: "_EventMapToMember",
        columnName: "A",
        formattedType: "text",
        isNullable: false,
        hasDefault: false,
      },
      {
        tableName: "_EventMapToMember",
        columnName: "B",
        formattedType: "integer",
        isNullable: false,
        hasDefault: false,
      },
    ])
    .sort((left, right) =>
      `${left.tableName}.${left.columnName}`.localeCompare(
        `${right.tableName}.${right.columnName}`,
      ),
    ),
  enums: enumBlocks
    .map((definition) => ({
      name: definition.name,
      values: enumValues(definition, false),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
  indexes: [],
  constraints: [],
};

for (const model of models) {
  for (const field of model.fields) {
    if (field.attributes.includes("@unique")) {
      const mappedName = field.attributes.match(
        /@unique\([^)]*map:\s*"([^"]+)"[^)]*\)/,
      )?.[1];
      catalog.indexes.push(
        indexName(model.tableName, [field.columnName], "unique", mappedName),
      );
    }
    if (field.attributes.includes("@id"))
      catalog.constraints.push(`${model.tableName}_pkey`);
  }
  for (const declaration of model.declarations) {
    const parsed = declaration.match(/^@@(id|unique|index)\((.*)\)$/);
    if (!parsed) continue;
    const [, kind, args] = parsed;
    const fieldNames = args.match(/\[([^\]]+)\]/)?.[1];
    if (!fieldNames) continue;
    const fields = splitArguments(fieldNames)
      .map((field) => field.match(/^\w+/)?.[0])
      .filter(Boolean);
    const mappedName = args.match(/map:\s*"([^"]+)"/)?.[1];
    const objectName =
      kind === "id"
        ? (mappedName ?? `${model.tableName}_pkey`)
        : indexName(model.tableName, fields, kind, mappedName);
    if (kind === "id") catalog.constraints.push(objectName);
    else catalog.indexes.push(objectName);
  }
  for (const relation of model.relations) {
    const fields = relation.attributes
      .match(/fields:\s*\[([^\]]+)\]/)?.[1]
      .split(",")
      .map((field) => field.trim());
    if (fields)
      catalog.constraints.push(`${model.tableName}_${fields.join("_")}_fkey`);
  }
}
catalog.indexes.push(
  "_MemberToRole_B_index",
  "_EventMapToMember_B_index",
  "idx_timer_npc_name",
);
catalog.constraints.push(
  "_MemberToRole_AB_pkey",
  "_MemberToRole_A_fkey",
  "_MemberToRole_B_fkey",
  "_EventMapToMember_AB_pkey",
  "_EventMapToMember_A_fkey",
  "_EventMapToMember_B_fkey",
  "Reservation_valid_time_range_check",
  "Reservation_reminder_minutes_check",
  "ReservationShare_distinct_guilds_check",
);
catalog.indexes.sort();
catalog.constraints.sort();
const output = [];
output.push(
  "// Generated from drizzle/legacy-prisma/schema.prisma. Do not edit by hand.",
);
output.push('import { sql } from "drizzle-orm";');
output.push(
  'import { boolean, check, doublePrecision, foreignKey, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";',
);
output.push("");

for (const definition of enumBlocks) {
  const { name } = definition;
  const values = enumValues(definition, true);
  output.push(
    `export const ${lowerFirst(name)}Enum = pgEnum(${quote(name)}, ${JSON.stringify(values)});`,
  );
}
output.push("");

for (const model of models) {
  output.push(`export const ${tableSymbol(model.name)} = pgTable(`);
  output.push(`  ${quote(model.tableName)},`);
  output.push("  {");
  for (const field of model.fields) {
    output.push(`    ${quote(field.fieldName)}: ${columnBuilder(field)},`);
  }
  output.push("  },");
  const extras = [];
  for (const field of model.fields) {
    if (!field.attributes.includes("@unique")) continue;
    const mappedName = field.attributes.match(
      /@unique\([^)]*map:\s*"([^"]+)"[^)]*\)/,
    )?.[1];
    extras.push(
      `uniqueIndex(${quote(indexName(model.tableName, [field.columnName], "unique", mappedName))}).on(table[${quote(field.fieldName)}])`,
    );
  }
  for (const declaration of model.declarations) {
    const parsed = declaration.match(/^@@(id|unique|index)\((.*)\)$/);
    if (!parsed) continue;
    const [, kind, args] = parsed;
    const fieldsMatch = args.match(/\[([^\]]+)\]/);
    if (!fieldsMatch) continue;
    const fieldSpecs = splitArguments(fieldsMatch[1]).map((field) => ({
      name: field.match(/^\w+/)?.[0],
      descending: /sort:\s*Desc/.test(field),
    }));
    if (fieldSpecs.some(({ name: fieldName }) => !fieldName)) continue;
    const fields = fieldSpecs.map(({ name: fieldName }) => fieldName);
    const mapName = args.match(/map:\s*"([^"]+)"/)?.[1];
    const name =
      kind === "id"
        ? (mapName ?? `${model.tableName}_pkey`)
        : indexName(model.tableName, fields, kind, mapName);
    const columns = fieldSpecs
      .map(
        ({ name: fieldName, descending }) =>
          `table[${quote(fieldName)}]${descending ? ".desc()" : ""}`,
      )
      .join(", ");
    if (kind === "id")
      extras.push(
        `primaryKey({ columns: [${columns}], name: ${quote(name)} })`,
      );
    else if (kind === "unique")
      extras.push(`uniqueIndex(${quote(name)}).on(${columns})`);
    else extras.push(`index(${quote(name)}).on(${columns})`);
  }
  for (const relation of model.relations) {
    const fields = relation.attributes
      .match(/fields:\s*\[([^\]]+)\]/)?.[1]
      .split(",")
      .map((field) => field.trim());
    const references = relation.attributes
      .match(/references:\s*\[([^\]]+)\]/)?.[1]
      .split(",")
      .map((field) => field.trim());
    if (!fields || !references) continue;
    const localFields = fields.map((fieldName) =>
      model.fields.find((field) => field.fieldName === fieldName),
    );
    const onDelete =
      relation.attributes.match(/onDelete:\s*(\w+)/)?.[1] ??
      (localFields.some((field) => field?.optional) ? "SetNull" : "Restrict");
    const onUpdate =
      relation.attributes.match(/onUpdate:\s*(\w+)/)?.[1] ?? "Cascade";
    const action =
      {
        Cascade: "cascade",
        SetNull: "set null",
        Restrict: "restrict",
        NoAction: "no action",
      }[onDelete] ?? "restrict";
    const updateAction =
      {
        Cascade: "cascade",
        SetNull: "set null",
        Restrict: "restrict",
        NoAction: "no action",
      }[onUpdate] ?? "cascade";
    extras.push(
      `foreignKey({ columns: [${fields.map((field) => `table[${quote(field)}]`).join(", ")}], foreignColumns: [${references.map((field) => `${tableSymbol(relation.target)}[${quote(field)}]`).join(", ")}], name: ${quote(`${model.tableName}_${fields.join("_")}_fkey`)} }).onDelete(${quote(action)}).onUpdate(${quote(updateAction)})`,
    );
  }
  if (model.tableName === "Reservation") {
    extras.push(
      'check("Reservation_valid_time_range_check", sql`${table["endsAt"]} > ${table["startsAt"]}`)',
    );
    extras.push(
      'check("Reservation_reminder_minutes_check", sql`${table["reminderMinutesBefore"]} IS NULL OR ${table["reminderMinutesBefore"]} IN (0, 5, 15, 30)`)',
    );
  }
  if (model.tableName === "ReservationShare") {
    extras.push(
      'check("ReservationShare_distinct_guilds_check", sql`${table["firstGuildId"]} < ${table["secondGuildId"]}`)',
    );
  }
  if (model.tableName === "Timer") {
    extras.push(
      'index("idx_timer_npc_name").using("btree", sql`(${table["npc"]}->>\'name\')`)',
    );
  }
  if (extras.length > 0) {
    output.push(`  (table) => [\n    ${extras.join(",\n    ")},\n  ],`);
  } else {
    output[output.length - 1] = "  }";
  }
  output.push(");");
  output.push("");
}

output.push(
  'export const memberToRoleTable = pgTable("_MemberToRole", { A: integer("A").notNull(), B: text("B").notNull() }, (table) => [primaryKey({ columns: [table.A, table.B], name: "_MemberToRole_AB_pkey" }), index("_MemberToRole_B_index").on(table.B), foreignKey({ columns: [table.A], foreignColumns: [memberTable.id], name: "_MemberToRole_A_fkey" }).onDelete("cascade").onUpdate("cascade"), foreignKey({ columns: [table.B], foreignColumns: [roleTable.id], name: "_MemberToRole_B_fkey" }).onDelete("cascade").onUpdate("cascade")]);',
);
output.push(
  'export const eventMapToMemberTable = pgTable("_EventMapToMember", { A: text("A").notNull(), B: integer("B").notNull() }, (table) => [primaryKey({ columns: [table.A, table.B], name: "_EventMapToMember_AB_pkey" }), index("_EventMapToMember_B_index").on(table.B), foreignKey({ columns: [table.A], foreignColumns: [eventMapTable.id], name: "_EventMapToMember_A_fkey" }).onDelete("cascade").onUpdate("cascade"), foreignKey({ columns: [table.B], foreignColumns: [memberTable.id], name: "_EventMapToMember_B_fkey" }).onDelete("cascade").onUpdate("cascade")]);',
);

await writeFile(outputUrl, `${output.join("\n")}\n`);

const catalogJson = JSON.stringify(catalog);
const catalogHash = createHash("sha256").update(catalogJson).digest("hex");
const compressedCatalog = gzipSync(catalogJson, { level: 9 }).toString(
  "base64",
);
const legacyManifest = await readFile(legacyManifestUrl, "utf8");
const legacyMigrationEvidenceHash = createHash("sha256")
  .update(legacyManifest)
  .digest("hex");
const baselineMigration = await readFile(baselineMigrationUrl, "utf8");
const baselineMigrationHash = createHash("sha256")
  .update(baselineMigration)
  .digest("hex");
await writeFile(
  catalogOutputUrl,
  [
    "// Generated from the immutable legacy Prisma schema and migration manifest.",
    "// Do not edit by hand.",
    'import { gunzipSync } from "node:zlib";',
    "",
    "interface ExpectedApiCatalog {",
    "  readonly tables: ReadonlyArray<string>;",
    "  readonly columns: ReadonlyArray<{",
    "    readonly tableName: string;",
    "    readonly columnName: string;",
    "    readonly formattedType: string;",
    "    readonly isNullable: boolean;",
    "    readonly hasDefault: boolean;",
    "  }> ;",
    "  readonly enums: ReadonlyArray<{",
    "    readonly name: string;",
    "    readonly values: ReadonlyArray<string>;",
    "  }> ;",
    "  readonly indexes: ReadonlyArray<string>;",
    "  readonly constraints: ReadonlyArray<string>;",
    "}",
    "",
    `const compressedCatalog = ${quote(compressedCatalog)};`,
    "",
    "export const EXPECTED_API_CATALOG: ExpectedApiCatalog = JSON.parse(",
    '  gunzipSync(Buffer.from(compressedCatalog, "base64")).toString("utf8"),',
    ");",
    `export const EXPECTED_API_CATALOG_SHA256 = ${quote(catalogHash)};`,
    `export const LEGACY_MIGRATION_EVIDENCE_SHA256 = ${quote(legacyMigrationEvidenceHash)};`,
    `export const BASELINE_MIGRATION_SHA256 = ${quote(baselineMigrationHash)};`,
    'export const BASELINE_MIGRATION_NAME = "20260901121000_legacy_prisma_baseline";',
    "export const BASELINE_MIGRATION_CREATED_AT = 1788264600000;",
    "",
  ].join("\n"),
);
