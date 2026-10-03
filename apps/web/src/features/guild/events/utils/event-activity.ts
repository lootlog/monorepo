type EventActivityInput = {
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

export type EventStatus = "upcoming" | "active" | "ended";

export const getEventStatusAtTimestamp = (
  event: EventActivityInput,
  currentTimestamp = Date.now(),
): EventStatus => {
  const eventStartTimestamp = Date.parse(event.startsAt ?? event.createdAt);
  const eventEndTimestamp = event.endsAt ? Date.parse(event.endsAt) : null;

  if (currentTimestamp < eventStartTimestamp) {
    return "upcoming";
  }

  if (eventEndTimestamp !== null && currentTimestamp >= eventEndTimestamp) {
    return "ended";
  }

  return "active";
};

/** Badge for an event's status, shared by the event list and detail header. */
export const EVENT_STATUS_PRESENTATION = {
  upcoming: { labelKey: "events.upcoming", badgeVariant: "outline" },
  active: { labelKey: "events.active", badgeVariant: "live" },
  ended: { labelKey: "events.ended", badgeVariant: "secondary" },
} as const satisfies Record<
  EventStatus,
  { labelKey: string; badgeVariant: "outline" | "live" | "secondary" }
>;
