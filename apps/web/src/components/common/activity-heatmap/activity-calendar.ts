export type ActivityDay = {
  date: string;
  value: number | null;
  partial?: boolean;
};

export function activityLevel(
  value: number | null,
  maximum: number,
): "unknown" | "zero" | 1 | 2 | 3 | 4 {
  if (value === null) return "unknown";
  if (value === 0) return "zero";
  const ratio = value / Math.max(1, maximum);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function calendarRange(now = new Date(), count = 365) {
  const endDate = calendarDateFormatter.format(now);
  const start = new Date(`${endDate}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - count + 1);
  return { from: start.toISOString().slice(0, 10), to: endDate };
}

export function calendarOffset(date: string) {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}
