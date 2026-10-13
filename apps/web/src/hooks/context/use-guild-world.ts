import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { z } from "zod";
import { useGuildId } from "@/hooks/context/use-guild-id";

/** The search param that carries the Organization's world in shared links. */
export const GUILD_WORLD_SEARCH_PARAM = "world";

const GUILD_WORLD_CHANGE_EVENT = "lootlog:guild-world-change";

const getGuildWorldStorageKey = (guildId: string | undefined) =>
  `lootlog:guild:${guildId ?? "global"}:world`;

// Anything unreadable falls back to all worlds instead of failing the page.
const storedGuildWorld = z.string().nullable().catch(null);

// An empty value comes from the time a world had to be picked first.
const toGuildWorld = (value: string | null | undefined) => value || null;

/** The world remembered for an Organization; `null` is all worlds. */
export const readStoredGuildWorld = (
  guildId: string | undefined,
): string | null => {
  try {
    const stored = localStorage.getItem(getGuildWorldStorageKey(guildId));

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
  try {
    localStorage.setItem(
      getGuildWorldStorageKey(guildId),
      JSON.stringify(world),
    );
  } catch {
    // Without storage the world still lives in the URL.
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

const useGuildWorldSources = () => {
  const guildId = useGuildId();

  // The router's own search, not a copy that catches up a render later: on a
  // move between Organizations it must never pair one's world with the other.
  const urlWorld = toGuildWorld(
    guildWorldSearch.safeParse(useSearch({ strict: false })).data?.world,
  );

  const router = useRouter();

  // Written through the router at once: a queued write would leave the old
  // world in the URL long enough for the sync to remember it again.
  const setUrlWorld = (world: string | null, replace: boolean) => {
    const { pathname, searchStr } = router.state.location;
    const searchParams = new URLSearchParams(searchStr);

    if (world) {
      searchParams.set(GUILD_WORLD_SEARCH_PARAM, world);
    } else {
      searchParams.delete(GUILD_WORLD_SEARCH_PARAM);
    }

    const query = searchParams.toString();

    void router.navigate({
      href: query ? `${pathname}?${query}` : pathname,
      replace,
    });
  };

  // Read on every render, so moving to another Organization never shows the
  // previous one's world for a render.
  const storedWorld = useSyncExternalStore(subscribeToStoredGuildWorld, () =>
    readStoredGuildWorld(guildId),
  );

  return {
    guildId,
    urlWorld,
    storedWorld,
    setUrlWorld,
  };
};

/**
 * The world every Organization page is scoped to; `null` is all worlds. A
 * shared link's `?world=` wins over the world remembered for the Organization.
 */
export const useGuildWorld = () => {
  const { guildId, urlWorld, storedWorld, setUrlWorld } =
    useGuildWorldSources();

  // Stored at once, so a navigation started right after the choice, such as
  // opening the loot list for an item, already lands on the chosen world.
  const setWorld = (world: string | null) => {
    storeGuildWorld(guildId, world);
    setUrlWorld(world, false);
  };

  return { world: urlWorld ?? storedWorld, setWorld };
};

/**
 * Keeps the remembered world and the URL in step for the Organization pages:
 * a link's world is remembered, and every page's URL names the world it shows
 * so it can be shared. Mount once, under the Organization route.
 */
export const useGuildWorldUrlSync = () => {
  const { guildId, urlWorld, storedWorld, setUrlWorld } =
    useGuildWorldSources();

  const showStoredWorldInUrl = useEffectEvent((world: string) => {
    setUrlWorld(world, true);
  });

  // Only a new URL world is remembered, so a choice still on its way to the
  // URL is never overwritten by the world it replaces.
  useEffect(() => {
    if (urlWorld) storeGuildWorld(guildId, urlWorld);
  }, [guildId, urlWorld]);

  useEffect(() => {
    if (!urlWorld && storedWorld) showStoredWorldInUrl(storedWorld);
  }, [urlWorld, storedWorld]);
};
