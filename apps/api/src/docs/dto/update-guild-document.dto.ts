import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { GUILD_DOCUMENT_TITLE_MAX_LENGTH } from "#src/docs/constants/docs-limits";
import { GuildDocumentContentSchema } from "./guild-document-content.schema.js";

const UpdateGuildDocumentSchema = z.object({
  content: GuildDocumentContentSchema,
  title: z.string().trim().min(1).max(GUILD_DOCUMENT_TITLE_MAX_LENGTH),
});

export class UpdateGuildDocumentDto extends createZodDto(
  UpdateGuildDocumentSchema,
) {}
