import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RequestMemberWebPresenceSchema = z.object({
  guildId: z.string().min(1),
});

export class RequestMemberWebPresenceDto extends createZodDto(
  RequestMemberWebPresenceSchema,
) {}
