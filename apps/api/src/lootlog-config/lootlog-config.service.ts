import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { ItemRarity, NpcType } from "#src/db/domain";
import { POSTGRES_POOL } from "#src/db/postgres.provider";
import { withPostgresTransaction } from "#src/db/postgres-transaction";
import type { UpdateLootlogConfigNpcDto } from "#src/lootlog-config/dto/update-lootlog-config-npc.dto";
import type { UpdateLootlogConfigDto } from "#src/lootlog-config/dto/update-lootlog-config.dto";

type LootlogConfigRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

type LootlogConfigNpcRow = {
  id: number;
  lootlogConfigId: string;
  npcType: (typeof NpcType)[keyof typeof NpcType];
  allowedRarities: Array<(typeof ItemRarity)[keyof typeof ItemRarity]> | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class LootlogConfigService {
  constructor(@Inject(POSTGRES_POOL) private readonly postgres: Pool) {}

  async getLootlogConfig(guildId: string) {
    const configResult = await this.postgres.query<LootlogConfigRow>(
      `SELECT "id", "createdAt", "updatedAt"
       FROM "LootlogConfig"
       WHERE "id" = $1`,
      [guildId],
    );
    const config = configResult.rows[0];

    return config ? this.withNpcs(this.postgres, config) : null;
  }

  async getMultipleLootlogConfigs(guildIds: string[]) {
    if (guildIds.length === 0) {
      return [];
    }

    const configs = await this.postgres.query<LootlogConfigRow>(
      `SELECT "id", "createdAt", "updatedAt"
       FROM "LootlogConfig"
       WHERE "id" = ANY($1::text[])`,
      [guildIds],
    );

    return Promise.all(
      configs.rows.map((config) => this.withNpcs(this.postgres, config)),
    );
  }

  async createLootlogConfig(guildId: string) {
    return withPostgresTransaction(this.postgres, async (transaction) => {
      const created = await transaction.query<LootlogConfigRow>(
        `INSERT INTO "LootlogConfig" ("id", "createdAt", "updatedAt")
         VALUES ($1, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING
         RETURNING "id", "createdAt", "updatedAt"`,
        [guildId],
      );
      const config = created.rows[0];
      if (!config) {
        return undefined;
      }

      const allowedRarities = Object.values(ItemRarity);
      for (const npcType of Object.values(NpcType)) {
        await transaction.query(
          `INSERT INTO "LootlogConfigNpc"
             ("lootlogConfigId", "npcType", "allowedRarities", "createdAt", "updatedAt")
           VALUES ($1, $2::"NpcType", $3::"ItemRarity"[], NOW(), NOW())`,
          [guildId, npcType, allowedRarities],
        );
      }

      return this.withNpcs(transaction, config);
    });
  }

  async updateLootlogConfig(guildId: string, { npcs }: UpdateLootlogConfigDto) {
    return withPostgresTransaction(this.postgres, async (transaction) => {
      const updated = await transaction.query<LootlogConfigRow>(
        `UPDATE "LootlogConfig"
         SET "updatedAt" = NOW()
         WHERE "id" = $1
         RETURNING "id", "createdAt", "updatedAt"`,
        [guildId],
      );

      for (const npc of npcs) {
        await transaction.query(
          `UPDATE "LootlogConfigNpc"
           SET "allowedRarities" = $3::"ItemRarity"[], "updatedAt" = NOW()
           WHERE "lootlogConfigId" = $1 AND "npcType" = $2::"NpcType"`,
          [guildId, npc.npcType, npc.allowedRarities],
        );
      }

      const config = updated.rows[0];
      return config ? this.withNpcs(transaction, config) : null;
    });
  }

  async updateNpc(
    guildId: string,
    npcId: string,
    data: UpdateLootlogConfigNpcDto,
  ) {
    const updated = await this.postgres.query<LootlogConfigNpcRow>(
      `UPDATE "LootlogConfigNpc"
       SET "allowedRarities" = $3::"ItemRarity"[], "updatedAt" = NOW()
       WHERE "lootlogConfigId" = $1 AND "id" = $2
       RETURNING "id", "lootlogConfigId", "npcType", "allowedRarities", "createdAt", "updatedAt"`,
      [guildId, Number(npcId), data.allowedRarities],
    );

    return updated.rows[0] ?? null;
  }

  private async withNpcs(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    config: LootlogConfigRow,
  ) {
    const npcs = await queryable.query<LootlogConfigNpcRow>(
      `SELECT "id", "lootlogConfigId", "npcType", "allowedRarities", "createdAt", "updatedAt"
       FROM "LootlogConfigNpc"
       WHERE "lootlogConfigId" = $1
       ORDER BY "id" DESC`,
      [config.id],
    );

    return { ...config, npcs: npcs.rows };
  }
}
