import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ItemRarity, LootSource, NpcType, Profession } from "#src/db/domain";
import { isoDatetimeCodec } from "./zod-response-codecs.js";

const LootItemResponseSchema = z
  .object({
    id: z.number(),
    hid: z.string(),
    name: z.string(),
    icon: z.string(),
    stat: z.string(),
    type: z.string().nullable(),
    rarity: z.nativeEnum(ItemRarity).nullable(),
    lvl: z.number(),
    prof: z.array(z.nativeEnum(Profession)),
  })
  .strict()
  .meta({ id: "LootItemResponseDto" });

const LootPlayerResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    lvl: z.number().nullable(),
    prof: z.nativeEnum(Profession).nullable(),
    icon: z.string().nullable(),
    characterId: z.number().nullable(),
    accountId: z.number().nullable(),
    hpp: z.number().nullable(),
  })
  .strict()
  .meta({ id: "LootPlayerResponseDto" });

const LootNpcResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    wt: z.number().nullable(),
    lvl: z.number().nullable(),
    prof: z.nativeEnum(Profession).nullable(),
    icon: z.string().nullable(),
    type: z.nativeEnum(NpcType).nullable(),
    margonemType: z.number().nullable(),
  })
  .strict()
  .meta({ id: "LootNpcResponseDto" });

const LootSubmissionMemberResponseSchema = z
  .object({
    name: z.string(),
    avatar: z.string().nullable().optional(),
    userId: z.string(),
  })
  .meta({ id: "LootSubmissionMemberResponseDto" });

const LootSubmissionResponseSchema = z
  .object({
    guildId: z.string(),
    memberId: z.number(),
    lootId: z.number(),
    member: LootSubmissionMemberResponseSchema,
  })
  .meta({ id: "LootSubmissionResponseDto" });

export const LootShareResponseSchema = z
  .record(z.string(), z.array(z.string()))
  .meta({ id: "LootShareResponseDto" });
export type LootShare = z.infer<typeof LootShareResponseSchema>;

export class LootShareResponseDto extends createZodDto(
  LootShareResponseSchema,
) {}

export class NullableLootItemResponseDto extends createZodDto(
  LootItemResponseSchema.nullable(),
) {}

const LootResponseSchema = z.object({
  id: z.number(),
  uniqueId: z.string(),
  world: z.string(),
  source: z.nativeEnum(LootSource),
  location: z.string(),
  items: z.array(LootItemResponseSchema),
  players: z.array(LootPlayerResponseSchema),
  npcs: z.array(LootNpcResponseSchema),
  lootShare: LootShareResponseSchema,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  submissions: z.array(LootSubmissionResponseSchema).optional(),
  commentsCount: z.number(),
});

export class LootResponseDto extends createZodDto(LootResponseSchema, {
  codec: true,
}) {}

export class NullableLootResponseDto extends createZodDto(
  LootResponseSchema.nullable(),
  {
    codec: true,
  },
) {}
