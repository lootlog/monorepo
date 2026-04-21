import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { isoDatetimeCodec } from "src/shared/dto/zod-response-codecs";

const ReservationResponseSchema = z.object({
  id: z.number().int(),
  reservationId: z.string(),
  createdDate: isoDatetimeCodec,
  fromDate: isoDatetimeCodec,
  toDate: isoDatetimeCodec,
  createdBy: z.string(),
  comment: z.string().nullable(),
});

export class ReservationResponseDto extends createZodDto(
  ReservationResponseSchema,
  {
    codec: true,
  },
) {}

const ReservationsResponseSchema = z.record(
  z.string(),
  z.array(ReservationResponseSchema),
);

export class ReservationsResponseDto extends createZodDto(
  ReservationsResponseSchema,
  {
    codec: true,
  },
) {}

const ReservationCardResponseSchema = z.object({
  lvl: z.number().int(),
  images: z.array(z.string()),
  maps: z.array(z.string()),
});

export class ReservationCardResponseDto extends createZodDto(
  ReservationCardResponseSchema,
) {}

const ReservationsCardsResponseSchema = z.record(
  z.string(),
  z.array(ReservationCardResponseSchema),
);

export class ReservationsCardsResponseDto extends createZodDto(
  ReservationsCardsResponseSchema,
) {}
