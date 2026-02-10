import { addonSdk } from "@/addons/sdk";
import type {
  GameClientAddon,
  GameClientComponentAddon,
  GameClientSetupAddon,
} from "@/addons/types";
import type { RuntimeUserAddon } from "@/hooks/api/use-runtime-user-addons";
import React from "react";
import * as reactJsxRuntime from "react/jsx-runtime";

type CommonJsModule = {
  exports: unknown;
};

type RuntimeRequire = (specifier: string) => unknown;

type RuntimeAddonCandidate = Partial<GameClientAddon> & {
  Mount?: unknown;
  setup?: unknown;
};

const createRuntimeRequire = (addonId: string): RuntimeRequire => {
  return (specifier: string) => {
    if (specifier === "react") {
      return React;
    }

    if (specifier === "react/jsx-runtime") {
      return reactJsxRuntime;
    }

    if (specifier === "@lootlog/addon-sdk") {
      return addonSdk;
    }

    throw new Error(
      `[addons] Runtime addon "${addonId}" imports unsupported module "${specifier}"`,
    );
  };
};

const normalizeRuntimeAddon = (
  runtimeAddon: RuntimeUserAddon,
  candidate: RuntimeAddonCandidate,
): GameClientAddon | null => {
  const baseAddon = {
    id: runtimeAddon.runtimeId,
    name: runtimeAddon.name,
    description:
      typeof candidate.description === "string"
        ? candidate.description
        : runtimeAddon.description ?? undefined,
    version:
      typeof candidate.version === "string"
        ? candidate.version
        : runtimeAddon.version,
    order:
      typeof candidate.order === "number" && Number.isFinite(candidate.order)
        ? candidate.order
        : undefined,
    defaultEnabled:
      typeof candidate.defaultEnabled === "boolean"
        ? candidate.defaultEnabled
        : true,
  };

  if (typeof candidate.Mount === "function") {
    return {
      ...baseAddon,
      Mount: candidate.Mount as GameClientComponentAddon["Mount"],
    };
  }

  if (typeof candidate.setup === "function") {
    return {
      ...baseAddon,
      setup: candidate.setup as GameClientSetupAddon["setup"],
    };
  }

  console.warn(
    `[addons] Runtime addon "${runtimeAddon.runtimeId}" has no Mount or setup function`,
  );
  return null;
};

const loadSingleRuntimeAddon = (
  runtimeAddon: RuntimeUserAddon,
): GameClientAddon | null => {
  if (!runtimeAddon.compiledCode?.trim()) {
    return null;
  }

  const module: CommonJsModule = { exports: {} };
  const runtimeRequire = createRuntimeRequire(runtimeAddon.runtimeId);

  try {
    const factory = new Function(
      "module",
      "exports",
      "require",
      runtimeAddon.compiledCode,
    ) as (module: CommonJsModule, exports: unknown, require: RuntimeRequire) => void;

    factory(module, module.exports, runtimeRequire);
  } catch (error) {
    console.error(
      `[addons] Failed to execute runtime addon "${runtimeAddon.runtimeId}":`,
      error,
    );
    return null;
  }

  const exportedValue = (
    module.exports as { default?: RuntimeAddonCandidate } | RuntimeAddonCandidate
  ) as { default?: RuntimeAddonCandidate };

  const candidate = exportedValue?.default ?? (module.exports as RuntimeAddonCandidate);

  if (!candidate || typeof candidate !== "object") {
    console.warn(
      `[addons] Runtime addon "${runtimeAddon.runtimeId}" did not export an addon object`,
    );
    return null;
  }

  return normalizeRuntimeAddon(runtimeAddon, candidate);
};

export const loadRuntimeAddons = (
  runtimeAddons: RuntimeUserAddon[],
): GameClientAddon[] => {
  const loadedAddons: GameClientAddon[] = [];
  const seenAddonIds = new Set<string>();

  for (const runtimeAddon of runtimeAddons) {
    if (seenAddonIds.has(runtimeAddon.runtimeId)) {
      console.warn(
        `[addons] Duplicate runtime addon id "${runtimeAddon.runtimeId}". Skipping.`,
      );
      continue;
    }

    const addon = loadSingleRuntimeAddon(runtimeAddon);
    if (!addon) {
      continue;
    }

    seenAddonIds.add(addon.id);
    loadedAddons.push(addon);
  }

  return loadedAddons;
};
