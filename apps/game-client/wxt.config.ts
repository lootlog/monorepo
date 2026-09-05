import { defineConfig } from "wxt";
import { loadEnv } from "vite";
import { buildProfile } from "./extension/build-profile";
import { checkBuild } from "./extension/check-build";
import { gameClientViteConfig } from "./vite.shared";

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
    for (const name of [
      "VITE_API_URL",
      "VITE_BATTLELOG_API_URL",
      "VITE_AUTH_SERVICE_URL",
      "VITE_GATEWAY_URL",
    ]) {
      const value = buildProfile(mode)[name];
      if (!value)
        throw new Error(`Missing extension environment variable: ${name}`);
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error(`${name} must use HTTP or HTTPS`);
      }
      hostPermissions.add(`${url.origin}/*`);
    }
    return {
      name: "__MSG_extensionName__",
      default_locale: "pl",
      action: { default_title: "__MSG_openLootlog__" },
      description: "__MSG_extensionDescription__",
      homepage_url: "https://lootlog.pl",
      host_permissions: [...hostPermissions],
      icons: { 128: "icon.png" },
      ...(browser === "firefox" && mode !== "production"
        ? {
            // Firefox's default MV3 CSP upgrades local ws:// to unavailable wss://.
            content_security_policy: {
              extension_pages: "script-src 'self'; object-src 'self'",
            },
          }
        : {}),
      ...(browser === "firefox"
        ? {
            browser_specific_settings: {
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
            },
          }
        : {
            minimum_chrome_version: "116",
            ...(env.EXTENSION_CHROME_KEY
              ? { key: env.EXTENSION_CHROME_KEY }
              : {}),
          }),
    };
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
        terserOptions: {
          ...config.build?.terserOptions,
          // Chrome rejects literal Unicode noncharacters (e.g. Lexical's U+FFFF).
          format: { ascii_only: true },
        },
      },
    };
  },
});
