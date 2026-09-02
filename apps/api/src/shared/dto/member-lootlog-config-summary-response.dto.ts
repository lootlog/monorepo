import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const CharacterLootlogGuildStatusSchema = z.object({
  accountId: z.string(),
  characterId: z.string(),
  enabledForGuild: z.boolean(),
  characterName: z.string().nullable(),
  world: z.string().nullable(),
  icon: z.string().nullable(),
  metadataStatus: z.enum([
    "resolved",
    "missing_snapshot",
    "invalid_character_ref",
  ]),
});

const MemberLootlogConfigSummaryResponseSchema = z.object({
  memberUserId: z.string(),
  guildId: z.string(),
  isActive: z.boolean(),
  configuredCharacterCount: z.number(),
  enabledCharacterCount: z.number(),
  characters: z.array(CharacterLootlogGuildStatusSchema),
});

export class CharacterLootlogGuildStatusDto extends createSchemaClass(
  CharacterLootlogGuildStatusSchema,
) {}

export class MemberLootlogConfigSummaryResponseDto extends createSchemaClass(
  MemberLootlogConfigSummaryResponseSchema,
) {}
