import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const FetchGuildPlayersSchema = z.object({
  limit: z.string().optional(),
  search: z.string().optional(),
});

export class FetchGuildPlayersDto extends createZodDto(
  FetchGuildPlayersSchema,
) {}
