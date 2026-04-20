import { z } from "zod";

export const ReservationRecordSchema = z.object({
  id: z.number(),
  reservationId: z.string(),
  createdDate: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  createdBy: z.string(),
});

export type ReservationRecordDto = z.infer<typeof ReservationRecordSchema>;

export const ReservationCreateEventSchema = z.object({
  guildId: z.string(),
  reservation: ReservationRecordSchema,
});

export type ReservationCreateEventDto = z.infer<
  typeof ReservationCreateEventSchema
>;

export const ReservationDeleteEventSchema = z.object({
  guildId: z.string(),
  reservation: ReservationRecordSchema,
});

export type ReservationDeleteEventDto = z.infer<
  typeof ReservationDeleteEventSchema
>;
