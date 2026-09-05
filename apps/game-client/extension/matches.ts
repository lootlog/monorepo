export const gameMatches = [
  "https://*.margonem.pl/*",
  "https://*.margonem.com/*",
];
export const excludedGameMatches = ["pl", "com"].flatMap((domain) =>
  ["", "www.", "new.", "forum.", "commons.", "dev-commons."].map(
    (prefix) => `https://${prefix}margonem.${domain}/*`,
  ),
);
