import { escapeRegExp } from "es-toolkit";

export const gameMatches = [
  "https://*.margonem.pl/*",
  "https://*.margonem.com/*",
];

/** Margonem subdomains that host no game world. */
export const nonGameSubdomains = [
  "www",
  "new",
  "forum",
  "commons",
  "dev-commons",
  "serwery",
  "pomoc",
];

export const excludedGameMatches = ["pl", "com"].flatMap((domain) =>
  ["", ...nonGameSubdomains.map((subdomain) => `${subdomain}.`)].map(
    (prefix) => `https://${prefix}margonem.${domain}/*`,
  ),
);

export const gamePageUrlPattern = new RegExp(
  `^https://(?!(?:${nonGameSubdomains.map(escapeRegExp).join("|")})\\.)[^./]+\\.margonem\\.(pl|com)/`,
);
