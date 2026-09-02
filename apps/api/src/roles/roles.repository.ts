import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import { guildTable, roleTable } from "../database/drizzle/schema.js";

type RoleWrite = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly color: number | null;
  readonly position: number | null;
  readonly permissions: ReadonlyArray<Permission>;
};

export class RolesRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findByGuildId(guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(roleTable)
          .where(eq(roleTable.guildId, guildId))
          .orderBy(desc(roleTable.position)),
      ),
    );
  }

  async findById(id: string, guildId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(roleTable)
          .where(and(eq(roleTable.id, id), eq(roleTable.guildId, guildId)))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  async findGuildOwnerId(guildId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ ownerId: guildTable.ownerId })
          .from(guildTable)
          .where(eq(guildTable.id, guildId))
          .limit(1),
      ),
    );
    return rows[0]?.ownerId ?? null;
  }

  async bulkCreate(roles: ReadonlyArray<RoleWrite>) {
    if (roles.length === 0) return { count: 0 };
    const now = new Date();
    const inserted = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(roleTable)
          .values(
            roles.map((role) => ({
              ...role,
              permissions: [...role.permissions],
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: roleTable.id }),
      ),
    );
    return { count: inserted.length };
  }

  upsert(
    role: RoleWrite,
    update: {
      readonly name: string;
      readonly color: number | null;
      readonly position: number | null;
      readonly permissions?: ReadonlyArray<Permission>;
    },
  ) {
    const now = new Date();
    const { permissions, ...roleFields } = update;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(roleTable)
          .values({
            ...role,
            permissions: [...role.permissions],
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: roleTable.id,
            set: {
              ...roleFields,
              ...(permissions ? { permissions: [...permissions] } : {}),
              updatedAt: now,
            },
          }),
      ),
    );
  }

  async updatePermissions(
    id: string,
    guildId: string,
    permissions: ReadonlyArray<Permission>,
    lvlRangeFrom: number | null,
    lvlRangeTo: number | null,
  ) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(roleTable)
          .set({
            permissions: [...permissions],
            lvlRangeFrom,
            lvlRangeTo,
            updatedAt: new Date(),
          })
          .where(and(eq(roleTable.id, id), eq(roleTable.guildId, guildId)))
          .returning(),
      ),
    );
    return rows[0] ?? null;
  }

  deleteById(id: string, guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(roleTable)
          .where(and(eq(roleTable.id, id), eq(roleTable.guildId, guildId))),
      ),
    );
  }

  deleteByGuildId(guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.delete(roleTable).where(eq(roleTable.guildId, guildId)),
      ),
    );
  }
}
