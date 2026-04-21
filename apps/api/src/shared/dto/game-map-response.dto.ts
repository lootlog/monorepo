import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const GameMapResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export class GameMapResponseDto extends createZodDto(GameMapResponseSchema) {}
