import {
  PORTABLE_THEME_MAX_BYTES,
  PortableThemeSchema,
  type PortableTheme,
  type ThemeConfigV1,
} from "@lootlog/types";
import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate";

const THEME_CODE_PREFIX = "LLT1.";

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const parsePortableTheme = (value: string) => {
  if (strToU8(value).byteLength > PORTABLE_THEME_MAX_BYTES) {
    throw new Error("THEME_IMPORT_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("THEME_IMPORT_INVALID_JSON");
  }
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "format" in parsed &&
    parsed.format === "lootlog-theme" &&
    "version" in parsed &&
    parsed.version !== 1
  ) {
    throw new Error("THEME_IMPORT_UNSUPPORTED_VERSION");
  }
  const result = PortableThemeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("THEME_IMPORT_INVALID_SCHEMA");
  }
  return result.data;
};

export const createPortableTheme = (
  name: string,
  config: ThemeConfigV1,
): PortableTheme =>
  PortableThemeSchema.parse({
    format: "lootlog-theme",
    version: 1,
    name,
    config,
  });

export const serializePortableTheme = (theme: PortableTheme) =>
  JSON.stringify(PortableThemeSchema.parse(theme), null, 2);

export const encodePortableThemeCode = (theme: PortableTheme) => {
  const payload = strToU8(JSON.stringify(PortableThemeSchema.parse(theme)));
  if (payload.byteLength > PORTABLE_THEME_MAX_BYTES) {
    throw new Error("THEME_EXPORT_TOO_LARGE");
  }
  return `${THEME_CODE_PREFIX}${encodeBase64Url(zlibSync(payload, { level: 9 }))}`;
};

export const decodePortableTheme = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith(THEME_CODE_PREFIX)) {
    return parsePortableTheme(trimmedValue);
  }
  if (trimmedValue.length > PORTABLE_THEME_MAX_BYTES * 2) {
    throw new Error("THEME_IMPORT_TOO_LARGE");
  }

  try {
    const compressed = decodeBase64Url(
      trimmedValue.slice(THEME_CODE_PREFIX.length),
    );
    const decompressed = unzlibSync(compressed, {
      out: new Uint8Array(PORTABLE_THEME_MAX_BYTES + 1),
    });
    if (decompressed.byteLength > PORTABLE_THEME_MAX_BYTES) {
      throw new Error("THEME_IMPORT_TOO_LARGE");
    }
    return parsePortableTheme(strFromU8(decompressed));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("THEME_IMPORT_")) {
      throw error;
    }
    throw new Error("THEME_IMPORT_INVALID_CODE");
  }
};

export const getUniqueThemeName = (
  desiredName: string,
  existingNames: string[],
) => {
  const normalizedNames = new Set(
    existingNames.map((name) => name.trim().toLocaleLowerCase("pl")),
  );
  if (!normalizedNames.has(desiredName.trim().toLocaleLowerCase("pl"))) {
    return desiredName.trim();
  }

  let suffix = 2;
  while (
    normalizedNames.has(
      `${desiredName.trim()} (${suffix})`.toLocaleLowerCase("pl"),
    )
  ) {
    suffix += 1;
  }
  return `${desiredName.trim()} (${suffix})`;
};

export const getPortableThemeFileName = (name: string) => {
  const safeName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `${safeName || "lootlog-theme"}.lootlog-theme.json`;
};
