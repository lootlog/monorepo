type EventActivityInput = {
  startsAt?: string;
  endsAt?: string;
};

export const isEventActiveAtTimestamp = (
  event: EventActivityInput,
  currentTimestamp = Date.now(),
): boolean => {
  const eventStartTimestamp = event.startsAt
    ? Date.parse(event.startsAt)
    : Number.NEGATIVE_INFINITY;
  const eventEndTimestamp = event.endsAt ? Date.parse(event.endsAt) : null;

  return (
    eventStartTimestamp <= currentTimestamp &&
    (eventEndTimestamp === null || currentTimestamp < eventEndTimestamp)
  );
};
