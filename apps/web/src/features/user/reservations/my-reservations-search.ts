import type { ListMyReservationsStatus } from "@lootlog/client/main";
import { Schema } from "effect";
import { optionalOrUndefined } from "@lootlog/schema/stored-value";

export const MY_RESERVATION_STATUSES = [
  "upcoming",
  "past",
] as const satisfies readonly ListMyReservationsStatus[];

export const parseMyReservationsSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    status: optionalOrUndefined(Schema.Literals(MY_RESERVATION_STATUSES)),
  }),
);
