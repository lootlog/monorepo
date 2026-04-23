import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";
import { itemHitSchema } from "./item-hit.schema";

const facetDistributionSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);

const facetStatSchema = z.object({
  min: z.number(),
  max: z.number(),
});

export const searchItemsResponseSchema = z
  .object({
    hits: z.array(itemHitSchema),
    estimatedTotalHits: z.number(),
    facetDistribution: facetDistributionSchema.default({}),
    facetStats: z.record(z.string(), facetStatSchema).default({}),
  })
  .describe("Item search results");

const SearchItemsResponseDtoBase: ZodDto<
  typeof searchItemsResponseSchema,
  false
> = createZodDto(searchItemsResponseSchema);

export class SearchItemsResponseDto extends SearchItemsResponseDtoBase {}
