const parts = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Warsaw",
});

/**
 * The numeric fields of a moment in Polish time. The text is assembled here
 * rather than by a locale formatter, whose wording differs between the server
 * and the browser and would break hydration.
 */
const read = (iso: string) => {
  const fields = Object.fromEntries(
    parts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );

  return {
    date: `${fields.day}.${fields.month}.${fields.year}`,
    time: `${fields.hour}:${fields.minute}`,
  };
};

export const formatDate = (iso: string) => read(iso).date;

export const formatDateTime = (iso: string) => {
  const { date, time } = read(iso);

  return `${date}, ${time}`;
};
