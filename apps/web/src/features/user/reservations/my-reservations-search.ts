import type { ListMyReservationsStatus } from "@lootlog/client/main";
import { Schema } from "effect";
import { optionalWithFallback } from "@/lib/lenient-schema";

export const MY_RESERVATION_STATUSES = [
  "upcoming",
  "past",
] as const satisfies readonly ListMyReservationsStatus[];

/** The tab lives in the URL; upcoming reservations open by default. */
export const parseMyReservationsSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    status: optionalWithFallback(Schema.Literals(MY_RESERVATION_STATUSES)),
  }),
);
