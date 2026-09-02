import { createSchemaClass } from "#src/shared/validation/schema-class";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";
import * as z from "zod";
import { EventListItemResponseSchema } from "./event-response.dto.js";

const PinnedEventResponseSchema = z.object({
  pinnedAt: isoDatetimeCodec,
  event: EventListItemResponseSchema,
});

export class PinnedEventResponseDto extends createSchemaClass(
  PinnedEventResponseSchema,
  {
    codec: true,
  },
) {}
