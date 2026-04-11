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

export const isEventActiveAtTimestamp = (
  event: EventActivityInput,
  currentTimestamp = Date.now(),
): boolean => {
  return getEventStatusAtTimestamp(event, currentTimestamp) === "active";
};
