export const formatDiscordRelativeTimestamp = (date: Date): string =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;
