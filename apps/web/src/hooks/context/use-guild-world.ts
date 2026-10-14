import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { z } from "zod";
import { useGuildId } from "@/hooks/context/use-guild-id";

/** The search param a link may use to open an Organization on a world. */
export const GUILD_WORLD_SEARCH_PARAM = "world";

const GUILD_WORLD_CHANGE_EVENT = "lootlog:guild-world-change";

const getGuildWorldStorageKey = (guildId: string | undefined) =>
  `lootlog:guild:${guildId ?? "global"}:world`;

// Anything unreadable falls back to all worlds instead of failing the page.
const storedGuildWorld = z.string().nullable().catch(null);

// An empty value comes from the time a world had to be picked first.
const toGuildWorld = (value: string | null | undefined) => value || null;

// Without storage the chosen world still lasts for this tab.
const unstoredGuildWorlds = new Map<string, string | null>();

/** The world remembered for an Organization; `null` is all worlds. */
export const readStoredGuildWorld = (
  guildId: string | undefined,
): string | null => {
  const key = getGuildWorldStorageKey(guildId);

  if (unstoredGuildWorlds.has(key)) return unstoredGuildWorlds.get(key) ?? null;

  try {
    const stored = localStorage.getItem(key);

    return toGuildWorld(
      stored ? storedGuildWorld.parse(JSON.parse(stored)) : null,
    );
  } catch {
    return null;
  }
};

/** Remembers an Organization's world and tells every mounted reader. */
export const storeGuildWorld = (
  guildId: string | undefined,
  world: string | null,
) => {
  const key = getGuildWorldStorageKey(guildId);

  try {
    localStorage.setItem(key, JSON.stringify(world));
    unstoredGuildWorlds.delete(key);
  } catch {
    unstoredGuildWorlds.set(key, world);
  }

  window.dispatchEvent(new Event(GUILD_WORLD_CHANGE_EVENT));
};

const subscribeToStoredGuildWorld = (onChange: () => void) => {
  window.addEventListener(GUILD_WORLD_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(GUILD_WORLD_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const guildWorldSearch = z.object({
  [GUILD_WORLD_SEARCH_PARAM]: z.string().optional(),
});

const useUrlWorld = () =>
  // The router's own search, not a copy that catches up a render later: on a
  // move between Organizations it must never pair one's world with the other.
  toGuildWorld(
    guildWorldSearch.safeParse(useSearch({ strict: false })).data?.world,
  );

const useStoredGuildWorld = (guildId: string | undefined) =>
  // Read on every render, so moving to another Organization never shows the
  // previous one's world for a render.
  useSyncExternalStore(subscribeToStoredGuildWorld, () =>
    readStoredGuildWorld(guildId),
  );

/**
 * The world every Organization page is scoped to; `null` is all worlds. A
 * link's `?world=` wins until it has been remembered for the Organization.
 */
export const useGuildWorld = () => {
  const guildId = useGuildId();
  const urlWorld = useUrlWorld();
  const storedWorld = useStoredGuildWorld(guildId);

  return {
    world: urlWorld ?? storedWorld,
    setWorld: (world: string | null) => storeGuildWorld(guildId, world),
  };
};

/**
 * Remembers the world a link carries and drops it from the URL, so the
 * Organization's pages keep clean addresses and navigate once. Mount once,
 * under the Organization route.
 */
export const useGuildWorldFromUrl = () => {
  const guildId = useGuildId();
  const urlWorld = useUrlWorld();
  const router = useRouter();

  const forgetUrlWorld = useEffectEvent(() => {
    const { pathname, searchStr, hash } = router.state.location;
    const searchParams = new URLSearchParams(searchStr);

    searchParams.delete(GUILD_WORLD_SEARCH_PARAM);

    const query = searchParams.toString();

    void router.navigate({
      href: `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`,
      replace: true,
    });
  });

  useEffect(() => {
    if (!urlWorld) return;

    storeGuildWorld(guildId, urlWorld);
    forgetUrlWorld();
  }, [guildId, urlWorld]);
};
