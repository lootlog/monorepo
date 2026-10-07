export const ONLINE_HISTORY_RETENTION_DAYS = 112;

export const onlineHistoryCutoff = (now: number): string =>
  new Date(now - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000).toISOString();
