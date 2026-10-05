import { Schema } from "effect";
import { NpcRoutingDataSchema } from "./npc-routing.js";

export type GuildLootEventNpc = {
  lvl?: number | null;
  prof?: string | null;
  type?: number | string | null;
  wt?: number | string | null;
};

export type GuildLootCreatedEventV2 = {
  version: 2;
  guildId: string;
  lootId: number;
  npcs: GuildLootEventNpc[];
};

export type GuildLootShareUpdatedEventV2 = GuildLootCreatedEventV2 & {
  lootShare: Record<string, string[]>;
};

const GuildLootEventNpcSchema = Schema.Struct({
  lvl: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  ...NpcRoutingDataSchema.fields,
});

export const GuildLootCreatedEventV2Schema = Schema.Struct({
  version: Schema.Literal(2),
  guildId: Schema.NonEmptyString,
  lootId: Schema.Int,
  npcs: Schema.Array(GuildLootEventNpcSchema),
});
