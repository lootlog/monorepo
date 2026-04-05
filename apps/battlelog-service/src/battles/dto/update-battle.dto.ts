import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateBattleSchema = z.object({
  public: z.boolean(),
});

export class UpdateBattleDto extends createZodDto(UpdateBattleSchema) {}
