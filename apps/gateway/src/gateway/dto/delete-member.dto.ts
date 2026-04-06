import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const DeleteMemberSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
});

export class DeleteMemberDto extends createZodDto(DeleteMemberSchema) {}
