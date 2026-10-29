import { defineConfig, type UserManifest } from "wxt";
import { loadEnv, type Plugin } from "vite";
import { buildProfile } from "./extension/build-profile";
import { checkBuild } from "./extension/check-build";
import { gameClientViteConfig } from "./vite.shared";

const UNICODE_NONCHARACTER =
  /[\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]/g;

const escapeCodeUnits = (character: string) =>
  character
    .split("")
    .map((unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .join("");

/**
 * Chrome refuses to load a content script that contains a literal Unicode
 * noncharacter (Lexical uses U+FFFF), and terser writes escaped ones back as
 * literals. A noncharacter can only sit in a string, template, regular
 * expression or comment, where its `\uXXXX` escape means the same (only a
 * template's raw text differs), so escape just those after minification
 * instead of making terser escape every non-ASCII character.
 */
const escapeUnicodeNoncharacters = (): Plugin => ({
  name: "lootlog:escape-unicode-noncharacters",
  apply: "build",
  enforce: "post",
  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (output.type === "chunk")
        output.code = output.code.replace(
          UNICODE_NONCHARACTER,
          escapeCodeUnits,
        );
    }
  },
});

export default defineConfig({
  srcDir: "src",
  entrypointsDir: "../extension/entrypoints",
  publicDir: "extension/public",
  outDir: ".output/production",
  hooks: {
    "build:done": async (wxt) => {
      await checkBuild(wxt.config.outDir, wxt.config.mode, wxt.config.command);
    },
  },
  imports: false,
  zip: { zipSources: false },
  manifestVersion: 3,
  manifest: ({ browser, mode }) => {
    const env = loadEnv(mode, import.meta.dirname, "");
    const hostPermissions = new Set<string>();

    const endpointNames: (keyof ReturnType<typeof buildProfile>)[] = [
      "VITE_API_URL",
      "VITE_BATTLELOG_API_URL",
      "VITE_AUTH_SERVICE_URL",
      "VITE_GATEWAY_URL",
    ];

    for (const name of endpointNames) {
      const value = buildProfile(mode)[name];

      if (!value)
        throw new Error(`Missing extension environment variable: ${name}`);
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error(`${name} must use HTTP or HTTPS`);
      }

      hostPermissions.add(`${url.origin}/*`);
    }

    const manifest: UserManifest = {
      name: "__MSG_extensionName__",
      default_locale: "pl",
      action: { default_title: "__MSG_openLootlog__" },
      description: "__MSG_extensionDescription__",
      homepage_url: "https://lootlog.pl",
      host_permissions: [...hostPermissions],
      icons: { 128: "icon.png" },
    };

    if (browser === "firefox") {
      if (mode !== "production") {
        // Firefox's default MV3 CSP upgrades local ws:// to unavailable wss://.
        manifest.content_security_policy = {
          extension_pages: "script-src 'self'; object-src 'self'",
        };
      }

      manifest.browser_specific_settings = {
        gecko: {
          id: "game-client@lootlog.pl",
          strict_min_version: "140.0",
          data_collection_permissions: {
            required: [
              "authenticationInfo",
              "personalCommunications",
              "websiteContent",
              "websiteActivity",
            ],
          },
        },
      };
    } else {
      manifest.minimum_chrome_version = "116";

      if (env.EXTENSION_CHROME_KEY) manifest.key = env.EXTENSION_CHROME_KEY;
    }

    return manifest;
  },
  vite: ({ mode }) => {
    const config = gameClientViteConfig(mode);

    return {
      ...config,
      define: {
        ...config.define,
        ...Object.fromEntries(
          Object.entries(buildProfile(mode)).map(([key, value]) => [
            `import.meta.env.${key}`,
            JSON.stringify(value),
          ]),
        ),
      },
      build: {
        ...config.build,
        minify: "terser",
      },
      plugins: [...(config.plugins ?? []), escapeUnicodeNoncharacters()],
    };
  },
});
