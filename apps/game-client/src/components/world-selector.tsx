import { Schema } from "effect";
import {
  toWorldOption,
  WorldCombobox,
  type WorldGroup,
} from "@/components/world-combobox";
import {
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  useGuildsControllerGetWorldsByGuildId,
} from "@lootlog/client/main";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { type FC, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

const recentWorldsSchema = Schema.mutable(Schema.Array(Schema.String));

const DEFAULT_RECENT_WORLDS: string[] = [];

const recentWorldsKey = (accountId: string, characterId: string) =>
  storageKey(`ll:recent-worlds:${accountId}:${characterId}`);

type WorldSelectorProps = {
  disabled?: boolean;
  className?: string;
  variant?: "default" | "strip";
};

const MAX_RECENT_WORLDS = 3;

export const WorldSelector: FC<WorldSelectorProps> = ({
  disabled = false,
  className = "",
  variant = "default",
}) => {
  const { t } = useTranslation("common");

  const { guildsQuery, preferencesQuery, visibleGuilds } = useLootlogGuilds();

  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");
  const defaultWorld = useGameStore((state) => state.game?.world ?? "unknown");

  const { guildId, world, setWorld } = useSettingsStore(
    useShallow((state) => {
      const currentGuildId = state.guildIdByCharId[characterId];

      return {
        guildId: currentGuildId,
        world: currentGuildId
          ? state.worldByGuildId[currentGuildId]
          : undefined,
        setWorld: state.setWorld,
      };
    }),
  );

  const {
    data: worlds,
    isFetched,
    isLoading,
  } = useGuildsControllerGetWorldsByGuildId(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getGuildsControllerGetWorldsByGuildIdQueryKey({
          guildId: guildId ?? "",
        }),
        enabled: !!guildId,
      },
    },
  );

  const [recentWorlds, setRecentWorlds] = useLocalStorage<string[]>(
    recentWorldsKey(accountId, characterId),
    DEFAULT_RECENT_WORLDS,
    recentWorldsSchema,
  );

  const showLoading = useDelayedVisibility(isLoading);

  useEffect(() => {
    if (!isFetched || !guildId || !worlds) return;

    if (!world) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(guildId, defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(guildId, worlds[0]);
      }

      return;
    }

    if (!worlds.includes(world)) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(guildId, defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(guildId, worlds[0]);
      }
    }
  }, [guildId, isFetched, worlds, world, defaultWorld, setWorld]);

  const worldGroups = useMemo<WorldGroup[]>(() => {
    if (!worlds || worlds.length === 0) return [];

    const availableWorlds = new Set(worlds);

    const recent = recentWorlds.flatMap((w) =>
      availableWorlds.has(w) ? [toWorldOption(w)] : [],
    );

    const recentValues = new Set(recent.map((w) => w.value));

    const rest = worlds.flatMap((w) =>
      recentValues.has(w) ? [] : [toWorldOption(w)],
    );

    const groups: WorldGroup[] = [];

    if (recent.length > 0) {
      groups.push({
        value: "recent",
        label: t("worldSelector.recent"),
        items: recent,
      });
    }

    if (rest.length > 0) {
      groups.push({
        value: "all",
        label: t("worldSelector.allWorlds"),
        items: rest,
      });
    }

    return groups;
  }, [recentWorlds, t, worlds]);

  const handleWorldChange = (newWorld: string) => {
    if (!guildId) return;

    const updatedRecent = [
      newWorld,
      ...recentWorlds.filter((w) => w !== newWorld),
    ].slice(0, MAX_RECENT_WORLDS);

    setRecentWorlds(updatedRecent);
    setWorld(guildId, newWorld);
  };

  if (
    !guildsQuery.isFetched ||
    !preferencesQuery.isFetched ||
    visibleGuilds.length === 0
  ) {
    return null;
  }

  const placeholder = showLoading
    ? t("async.loading")
    : t("worldSelector.placeholder");

  return (
    <WorldCombobox
      groups={worldGroups}
      value={world}
      onValueChange={handleWorldChange}
      placeholder={placeholder}
      disabled={disabled || isLoading}
      variant={variant}
      className={className}
    />
  );
};
