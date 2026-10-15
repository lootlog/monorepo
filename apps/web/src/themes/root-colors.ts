import { useSyncExternalStore } from "react";
import {
  CUSTOM_THEME_TOKEN_KEYS,
  type CustomThemeTokenKey,
} from "@lootlog/schema/custom-theme";

type RootColors = Partial<Record<CustomThemeTokenKey, string>>;

/**
 * Converts any CSS colour the browser understands, such as `oklch(...)`, to
 * `#RRGGBB` by painting one pixel, so a colour picker can show it.
 */
const toHex = (context: CanvasRenderingContext2D, color: string) => {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000000";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);

  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

/** The colour every token has on the page right now, as `#RRGGBB`. */
const readRootColors = (root: HTMLElement): RootColors => {
  const context = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });

  if (!context) return {};

  const style = getComputedStyle(root);

  return Object.fromEntries(
    CUSTOM_THEME_TOKEN_KEYS.flatMap((token) => {
      const value = style.getPropertyValue(`--${token}`).trim();

      return value ? [[token, toHex(context, value)]] : [];
    }),
  );
};

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  return () => observer.disconnect();
};

// The theme lives in the root's class and inline tokens; they change
// together, so they key the colours read from the page.
const appliedThemeKey = () =>
  `${document.documentElement.className}|${document.documentElement.getAttribute("style") ?? ""}`;

type CachedRootColors = { key: string; colors: RootColors };

let cached: CachedRootColors = { key: "", colors: {} };

const getColors = () => {
  const key = appliedThemeKey();

  if (key !== cached.key) {
    cached = { key, colors: readRootColors(document.documentElement) };
  }

  return cached.colors;
};

/**
 * The page's token colours, kept current as the theme or its preview changes,
 * so a colour field shows exactly what the page paints.
 */
export const useRootColors = () => useSyncExternalStore(subscribe, getColors);
