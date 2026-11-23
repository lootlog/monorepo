const LOOTLOG_HOSTNAME = "lootlog.pl";

export const signInRetryUrl = (retry: string | undefined, origin: string) => {
  const url = retry === undefined ? null : URL.parse(retry, origin);

  if (url === null) return undefined;

  const isLootlogSite =
    url.protocol === "https:" &&
    (url.hostname === LOOTLOG_HOSTNAME ||
      url.hostname.endsWith(`.${LOOTLOG_HOSTNAME}`));

  return url.origin === origin || isLootlogSite ? url.toString() : undefined;
};
