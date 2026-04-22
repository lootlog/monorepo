import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";
import { itemHitSchema } from "../../items/dto/item-hit.schema";
import { npcHitSchema } from "../../npcs/dto/npc-hit.schema";
import { playerHitSchema } from "../../players/dto/player-hit.schema";

export const searchAllResponseSchema = z
  .object({
    items: z.array(itemHitSchema),
    players: z.array(playerHitSchema),
    npcs: z.array(npcHitSchema),
  })
  .describe("Aggregated search results");

const SearchAllResponseDtoBase: ZodDto<typeof searchAllResponseSchema, false> =
  createZodDto(searchAllResponseSchema);

export class SearchAllResponseDto extends SearchAllResponseDtoBase {}
