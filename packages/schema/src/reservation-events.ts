import { Schema } from "effect";

export type ReservationChangedEventV2 = {
  version: 2;
  action: "created" | "updated" | "deleted" | "sharing-changed";
  sourceGuildId: string;
  audienceGuildIds: string[];
  reservationId: number | null;
  spotId: string | null;
};

export const ReservationChangedEventV2Schema = Schema.Struct({
  version: Schema.Literal(2),
  action: Schema.Literals(["created", "updated", "deleted", "sharing-changed"]),
  sourceGuildId: Schema.NonEmptyString,
  audienceGuildIds: Schema.Array(Schema.NonEmptyString),
  reservationId: Schema.NullOr(Schema.Int),
  spotId: Schema.NullOr(Schema.String),
});
