const formatDiscordTimestamp = (date: Date, style: "R" | "f" | "D"): string =>
  `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

export const formatDiscordRelativeTimestamp = (date: Date): string =>
  formatDiscordTimestamp(date, "R");
