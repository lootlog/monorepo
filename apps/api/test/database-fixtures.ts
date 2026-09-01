import { createId } from "@paralleldrive/cuid2";
import type { PrismaService } from "../src/db/prisma.service.js";
import { postgresPool } from "../src/prisma/db.js";
import contract from "../src/prisma/contract.json" with { type: "json" };
import { dateToTemporal } from "../src/db/temporal.js";

const generatedStringIdModels = new Set([
  "Event",
  "EventHeroKill",
  "EventHeroNpc",
  "EventKillPoint",
  "EventMap",
  "EventMapAssignmentHistory",
  "EventMapCoverageGap",
  "EventMapLocation",
  "EventPointsEditHistory",
  "EventPresenceLog",
  "EventRanking",
  "EventRespawnWindowSummary",
  "GuildDocument",
  "GuildDocumentHistory",
  "GuildKillSummary",
  "GuildKillSummaryBucket",
  "MapTemplate",
  "NpcKillStats",
  "NpcKillStatsBucket",
  "UserKillStats",
  "UserKillStatsBucket",
]);

export async function insertDatabaseFixture(
  _prisma: PrismaService,
  modelName: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const model = contract.domain.namespaces.public.models[modelName];
  if (!model) throw new Error(`Unknown fixture model: ${modelName}`);

  const data = { ...input };
  if (modelName === "NpcSnapshot" && data.type !== undefined) {
    data._type = data.type;
    delete data.type;
  }
  const roles = data.roles as { connect?: { id: string } } | undefined;
  const assignedMembers = data.assignedMembers as
    | { connect?: Array<{ id: number }> }
    | undefined;
  const nestedNpcs = data.npcs as
    | { create?: Array<Record<string, unknown>> }
    | undefined;
  delete data.roles;
  delete data.assignedMembers;
  delete data.npcs;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      delete data[key];
    }
  }

  if (generatedStringIdModels.has(modelName) && data.id === undefined) {
    data.id = createId();
  }
  if (model.fields.updatedAt && data.updatedAt === undefined) {
    data.updatedAt = dateToTemporal(new Date());
  }

  const columns = Object.keys(data);
  for (const column of columns) {
    if (!model.fields[column]) {
      throw new Error(`Unknown fixture field ${modelName}.${column}`);
    }
  }
  const identifiers = columns
    .map(
      (column) =>
        `"${modelName === "NpcSnapshot" && column === "_type" ? "type" : column}"`,
    )
    .join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const result = await postgresPool.query(
    `INSERT INTO "${modelName}" (${identifiers}) VALUES (${placeholders}) RETURNING *`,
    columns.map((column) => {
      const value = data[column];
      return value instanceof Date ? dateToTemporal(value).toString() : value;
    }),
  );
  const record = result.rows[0];

  await connectFixtureRelations(
    _prisma,
    modelName,
    record,
    roles,
    assignedMembers,
    nestedNpcs,
  );

  return record;
}

async function connectFixtureRelations(
  prisma: PrismaService,
  modelName: string,
  record: Record<string, unknown>,
  roles: { connect?: { id: string } } | undefined,
  assignedMembers: { connect?: Array<{ id: number }> } | undefined,
  nestedNpcs: { create?: Array<Record<string, unknown>> } | undefined,
): Promise<void> {
  if (modelName === "Member" && roles?.connect) {
    await postgresPool.query(
      `INSERT INTO "_MemberToRole" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [record.id, roles.connect.id],
    );
  }

  if (modelName === "EventMap" && assignedMembers?.connect) {
    await Promise.all(
      assignedMembers.connect.map((member) =>
        postgresPool.query(
          `INSERT INTO "_EventMapToMember" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [record.id, member.id],
        ),
      ),
    );
  }

  if (modelName === "LootlogConfig" && nestedNpcs?.create) {
    await Promise.all(
      nestedNpcs.create.map((npc) =>
        insertDatabaseFixture(prisma, "LootlogConfigNpc", {
          ...npc,
          lootlogConfigId: record.id,
        }),
      ),
    );
  }
}

export async function insertDatabaseFixtures(
  prisma: PrismaService,
  modelName: string,
  inputs: Array<Record<string, unknown>>,
): Promise<number> {
  await Promise.all(
    inputs.map((input) => insertDatabaseFixture(prisma, modelName, input)),
  );
  return inputs.length;
}
