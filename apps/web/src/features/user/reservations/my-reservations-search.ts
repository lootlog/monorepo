import type { ListMyReservationsStatus } from "@lootlog/client/main";
import { z } from "zod";

export const MY_RESERVATION_STATUSES = [
  "upcoming",
  "past",
] as const satisfies readonly ListMyReservationsStatus[];

/** The tab lives in the URL; upcoming reservations open by default. */
export const parseMyReservationsSearch = z.object({
  status: z.enum(MY_RESERVATION_STATUSES).optional().catch(undefined),
}).parse;
