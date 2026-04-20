import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

export const playerHitSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    lvl: z.number(),
    prof: z.string(),
    icon: z.string(),
    characterId: z.number(),
    accountId: z.number(),
    world: z.string(),
  })
  .describe("Player search hit");

const PlayerHitDtoBase: ZodDto<typeof playerHitSchema, false> =
  createZodDto(playerHitSchema);

export class PlayerHitDto extends PlayerHitDtoBase {}

const GetPlayersResponseSchema = z.array(playerHitSchema);

const GetPlayersResponseDtoBase: ZodDto<
  typeof GetPlayersResponseSchema,
  false
> = createZodDto(GetPlayersResponseSchema);

export class GetPlayersResponseDto extends GetPlayersResponseDtoBase {}
