export type ReservationChangedEventV2 = {
  version: 2;
  action: "created" | "updated" | "deleted" | "sharing-changed";
  sourceGuildId: string;
  audienceGuildIds: string[];
  reservationId: number | null;
  spotId: string | null;
};
