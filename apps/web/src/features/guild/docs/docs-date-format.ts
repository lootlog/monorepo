const guildDocDateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const formatGuildDocDateTime = (value: Date | string) =>
  guildDocDateTimeFormatter.format(new Date(value));
