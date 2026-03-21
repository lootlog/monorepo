const pad = (value: number) => String(value).padStart(2, "0");
const isInvalidDate = (value: Date) => Number.isNaN(value.getTime());

export const toDateTimeLocalValue = (
  value: string | Date | null | undefined,
): string => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isInvalidDate(date)) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromDateTimeLocalValueToIso = (
  value: string | null | undefined,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (isInvalidDate(date)) {
    return undefined;
  }

  return date.toISOString();
};
