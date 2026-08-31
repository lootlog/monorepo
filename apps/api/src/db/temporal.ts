type DatabaseTemporal = Date | { toString(): string };

export function temporalToDate(value: DatabaseTemporal): Date {
  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value.toString());
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid database temporal value");
  }

  return date;
}
