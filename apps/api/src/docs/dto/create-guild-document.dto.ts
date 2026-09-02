import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import { GUILD_DOCUMENT_TITLE_MAX_LENGTH } from "#src/docs/constants/docs-limits";

const CreateGuildDocumentSchema = z.object({
  title: z.string().trim().min(1).max(GUILD_DOCUMENT_TITLE_MAX_LENGTH),
});

export class CreateGuildDocumentDto extends createZodDto(
  CreateGuildDocumentSchema,
) {}
