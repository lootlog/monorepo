type DatabaseTemporal =
  | Date
  | {
      epochMilliseconds?: number;
      toString(): string;
      toZonedDateTime?(timeZone: string): { epochMilliseconds: number };
    };

export function temporalToDate(value: DatabaseTemporal): Date {
  if (value instanceof Date) {
    return value;
  }

  let dateValue: number | string;
  if (typeof value.epochMilliseconds === "number") {
    dateValue = value.epochMilliseconds;
  } else if (typeof value.toZonedDateTime === "function") {
    dateValue = value.toZonedDateTime("UTC").epochMilliseconds;
  } else {
    dateValue = `${value.toString()}Z`;
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid database temporal value");
  }

  return date;
}
