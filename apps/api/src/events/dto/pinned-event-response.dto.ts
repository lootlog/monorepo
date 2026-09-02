import { createZodDto } from "nestjs-zod";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";
import * as z from "zod";
import { EventListItemResponseSchema } from "./event-response.dto.js";

const PinnedEventResponseSchema = z.object({
  pinnedAt: isoDatetimeCodec,
  event: EventListItemResponseSchema,
});

export class PinnedEventResponseDto extends createZodDto(
  PinnedEventResponseSchema,
  {
    codec: true,
  },
) {}
