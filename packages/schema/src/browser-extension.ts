import * as Schema from "effect/Schema";

export const ChromeExtensionOrigin = Schema.String.check(
  Schema.isPattern(/^chrome-extension:\/\/[a-p]{32}$/),
);

export const FirefoxExtensionOrigin = Schema.String.check(
  Schema.isPattern(
    /^moz-extension:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  ),
);
