import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const AddMemberSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
});

export class AddMemberDto extends createZodDto(AddMemberSchema) {}
