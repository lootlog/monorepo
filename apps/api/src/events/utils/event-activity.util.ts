import { and, or } from "@prisma/orm-family-sql/orm-client";

type EventActivityWindow = {
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
};

function getEventEffectiveStartDate(event: EventActivityWindow): Date {
  return event.startsAt ?? event.createdAt;
}

export function isEventActiveAt(
  event: EventActivityWindow,
  referenceTime: Date,
): boolean {
  return (
    getEventEffectiveStartDate(event) <= referenceTime &&
    (event.endsAt === null || referenceTime < event.endsAt)
  );
}

export function applyActiveEventFilter(collection: any, referenceTime: Date) {
  return collection.where((event) =>
    and(
      or(event.startsAt.isNull(), event.startsAt.lte(referenceTime)),
      or(event.endsAt.isNull(), event.endsAt.gt(referenceTime)),
    ),
  );
}

export function attachComputedEventActive<T extends EventActivityWindow>(
  event: T,
  referenceTime: Date,
): T & { active: boolean } {
  return {
    ...event,
    active: isEventActiveAt(event, referenceTime),
  };
}

export function compareEventsByActivityAndStart<
  T extends EventActivityWindow & { active: boolean },
>(leftEvent: T, rightEvent: T): number {
  if (leftEvent.active !== rightEvent.active) {
    return Number(rightEvent.active) - Number(leftEvent.active);
  }

  return (
    getEventEffectiveStartDate(rightEvent).getTime() -
    getEventEffectiveStartDate(leftEvent).getTime()
  );
}
