import { loadEnv, type Plugin, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import gameClientPackage from "./package.json" with { type: "json" };

/** Tailwind CSS v4's baseline, which every supported browser meets. */
const BROWSER_TARGETS = ["chrome111", "edge111", "firefox128", "safari16.4"];

const COLOR_MIX_SUPPORTS = "@supports (color:color-mix(in lab, red, red)){";

const SINGLE_RULE = /^([^{};]+)\{([^{}]*)\}$/;

const PRECEDING_RULE = /([^{};]+)\{([^{}]*)\}$/;

/** Splits a minified selector list on its top-level, unescaped commas. */
const splitSelectorList = (list: string) => {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < list.length; index++) {
    const char = list[index];

    if (char === "\\") index++;
    else if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      selectors.push(list.slice(start, index));
      start = index + 1;
    }
  }

  return [...selectors, list.slice(start)];
};

const parseDeclarations = (body: string) =>
  body
    .split(";")
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(":");

      return {
        property: declaration.slice(0, colon),
        important: declaration.endsWith("!important"),
      };
    });

/**
 * Tailwind follows each `color-mix()` colour with a fallback rule and wraps
 * the real value in `@supports (color: color-mix(in lab, red, red))`, which
 * every browser in BROWSER_TARGETS passes. Unwrap each single-rule block and
 * drop the fallback declarations of the rule right before it when the
 * unwrapped rule, with the same selector, redeclares all of them. Anything
 * that does not match this minified shape is left untouched.
 */
const stripColorMixFallbacks = (css: string): string => {
  let head = "";
  let cursor = 0;

  for (
    let start = css.indexOf(COLOR_MIX_SUPPORTS);
    start !== -1;
    start = css.indexOf(COLOR_MIX_SUPPORTS, cursor)
  ) {
    const bodyStart = start + COLOR_MIX_SUPPORTS.length;
    const bodyEnd = css.indexOf("}", bodyStart) + 1;

    if (bodyEnd === 0) break;

    const inner = SINGLE_RULE.exec(css.slice(bodyStart, bodyEnd));

    head += css.slice(cursor, start);
    cursor = bodyEnd + 1;

    if (!inner || css[bodyEnd] !== "}") {
      head += css.slice(start, cursor);
      continue;
    }

    const [, selector, body] = inner;
    const preceding = PRECEDING_RULE.exec(head);

    if (preceding && !/["']|url\(/.test(preceding[2] + body)) {
      const [, precedingSelector, precedingBody] = preceding;
      const selectors = splitSelectorList(precedingSelector);

      const redeclared = new Map(
        parseDeclarations(body).map(({ property, important }) => [
          property,
          important,
        ]),
      );

      const overridden = parseDeclarations(precedingBody).every(
        ({ property, important }) =>
          redeclared.has(property) && (redeclared.get(property) || !important),
      );

      if (overridden && selectors.includes(selector)) {
        const remaining = selectors.filter((item) => item !== selector);

        head =
          head.slice(0, preceding.index) +
          (remaining.length > 0
            ? `${remaining.join(",")}{${precedingBody}}`
            : "");
      }
    }

    head += `${selector}{${body}}`;
  }

  return head + css.slice(cursor);
};

const stripColorMixFallbacksPlugin = (): Plugin => ({
  name: "lootlog:strip-color-mix-fallbacks",
  apply: "build",
  transform: {
    filter: { id: /\.css(?:\?|$)/ },
    handler: (code) =>
      code.includes(COLOR_MIX_SUPPORTS)
        ? { code: stripColorMixFallbacks(code), map: null }
        : undefined,
  },
});

export function gameClientViteConfig(mode: string): UserConfig {
  const env = loadEnv(mode, import.meta.dirname, "");

  const useFastLocalMinifier =
    env.FAST_BUILD === "1" || process.env.FAST_BUILD === "1";

  const commitSha =
    env.VITE_COMMIT_SHA ||
    env.WORKERS_CI_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    "";

  const runtimeVersion =
    env.VITE_GAME_CLIENT_VERSION ||
    commitSha ||
    process.env.npm_package_version ||
    "development";

  const buildTimestamp = new Date().toISOString();

  return {
    define: {
      "import.meta.env.VITE_BUILD_TIMESTAMP": JSON.stringify(buildTimestamp),
      "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
      "import.meta.env.VITE_GAME_CLIENT_PACKAGE_VERSION": JSON.stringify(
        gameClientPackage.version,
      ),
      "import.meta.env.VITE_GAME_CLIENT_VERSION":
        JSON.stringify(runtimeVersion),
    },
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
        {
          find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
          replacement: path.resolve(
            import.meta.dirname,
            "./src/shims/use-sync-external-store-with-selector.ts",
          ),
        },
        {
          find: /^use-sync-external-store\/shim(\/index)?(\.js)?$/,
          replacement: "react",
        },
      ],
    },
    build: {
      minify: useFastLocalMinifier ? "oxc" : "terser",
      sourcemap: false,
      terserOptions: {
        compress: {
          drop_debugger: true,
          passes: 1,
        },
      },
      // Margonem runs in current browsers; the extension requires Chrome 116
      // and Firefox 140. Targeting the same browsers as the CSS keeps class
      // fields and other ES2022 syntax native instead of shipping helpers.
      target: BROWSER_TARGETS,
      // Lightning CSS lowers `:is()` to `:-webkit-any()` for older browsers.
      // That fallback has pseudo-class specificity, so the preflight reset
      // would beat Tailwind utilities in production builds only.
      cssTarget: BROWSER_TARGETS,
    },
    plugins: [
      react({ compiler: true }),
      tailwindcss(),
      stripColorMixFallbacksPlugin(),
    ],
  };
}
