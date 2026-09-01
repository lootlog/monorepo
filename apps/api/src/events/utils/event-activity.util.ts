import { and, or } from "@prisma/orm-family-sql/orm-client";
import {
  dateToTemporal,
  temporalToDate,
  type DatabaseTemporal,
} from "#src/db/temporal";

type EventActivityWindow = {
  startsAt: DatabaseTemporal | null;
  endsAt: DatabaseTemporal | null;
  createdAt: DatabaseTemporal;
};

function getEventEffectiveStartDate(event: EventActivityWindow): Date {
  return temporalToDate(event.startsAt ?? event.createdAt);
}

export function isEventActiveAt(
  event: EventActivityWindow,
  referenceTime: Date,
): boolean {
  const endsAt = temporalToDate(event.endsAt);
  return (
    getEventEffectiveStartDate(event) <= referenceTime &&
    (endsAt === null || referenceTime < endsAt)
  );
}

export function applyActiveEventFilter(collection: any, referenceTime: Date) {
  const databaseReferenceTime = dateToTemporal(referenceTime);
  return collection.where((event) =>
    and(
      or(event.startsAt.isNull(), event.startsAt.lte(databaseReferenceTime)),
      or(event.endsAt.isNull(), event.endsAt.gt(databaseReferenceTime)),
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
