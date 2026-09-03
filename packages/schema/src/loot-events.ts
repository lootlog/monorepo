import { Schema } from "effect";

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

export const GuildLootEventNpcSchema = Schema.Struct({
  lvl: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  prof: Schema.optionalKey(Schema.NullOr(Schema.String)),
  type: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  wt: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
});
export const GuildLootCreatedEventV2Schema = Schema.Struct({
  version: Schema.Literal(2),
  guildId: Schema.NonEmptyString,
  lootId: Schema.Int,
  npcs: Schema.Array(GuildLootEventNpcSchema),
});
export const GuildLootShareUpdatedEventV2Schema = Schema.Struct({
  version: Schema.Literal(2),
  guildId: Schema.NonEmptyString,
  lootId: Schema.Int,
  npcs: Schema.Array(GuildLootEventNpcSchema),
  lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});
