import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { Option, Schema } from "effect";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { requiredWithFallback } from "@lootlog/schema/stored-value";

const GUILD_WORLD_SEARCH_PARAM = "world";

const GUILD_WORLD_CHANGE_EVENT = "lootlog:guild-world-change";

const getGuildWorldStorageKey = (guildId: string | undefined) =>
  `lootlog:guild:${guildId ?? "global"}:world`;

const decodeStoredGuildWorld = Schema.decodeUnknownSync(
  requiredWithFallback(Schema.NullOr(Schema.String), null),
);

const toGuildWorld = (value: string | null | undefined) => value || null;

const unstoredGuildWorlds = new Map<string, string | null>();

export const readStoredGuildWorld = (
  guildId: string | undefined,
): string | null => {
  const key = getGuildWorldStorageKey(guildId);

  if (unstoredGuildWorlds.has(key)) return unstoredGuildWorlds.get(key) ?? null;

  try {
    const stored = localStorage.getItem(key);

    return toGuildWorld(
      stored ? decodeStoredGuildWorld(JSON.parse(stored)) : null,
    );
  } catch {
    return null;
  }
};

export const readGuildWorld = (
  guildId: string | undefined,
  searchStr: string,
): string | null =>
  toGuildWorld(new URLSearchParams(searchStr).get(GUILD_WORLD_SEARCH_PARAM)) ??
  readStoredGuildWorld(guildId);

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

const decodeGuildWorldSearch = Schema.decodeUnknownOption(
  Schema.Struct({ [GUILD_WORLD_SEARCH_PARAM]: Schema.optional(Schema.String) }),
);

const useUrlWorld = () =>
  toGuildWorld(
    Option.getOrUndefined(decodeGuildWorldSearch(useSearch({ strict: false })))
      ?.world,
  );

const useStoredGuildWorld = (guildId: string | undefined) =>
  useSyncExternalStore(subscribeToStoredGuildWorld, () =>
    readStoredGuildWorld(guildId),
  );

export const useGuildWorld = () => {
  const guildId = useGuildId();
  const urlWorld = useUrlWorld();
  const storedWorld = useStoredGuildWorld(guildId);

  return {
    world: urlWorld ?? storedWorld,
    setWorld: (world: string | null) => storeGuildWorld(guildId, world),
  };
};

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
