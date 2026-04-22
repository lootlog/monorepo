import { Combobox, type ComboboxGroup } from "@/components/ui/combobox";
import { Game } from "@/lib/game";
import {
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  useGuildsControllerGetWorldsByGuildId,
} from "@/lib/api/generated/main/guilds/guilds";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useEffect, useMemo } from "react";
import { useLocalStorage } from "react-use";
import { storageKey } from "@/lib/storage-key";
import { useTranslation } from "react-i18next";

const recentWorldsKey = (accountId: string, characterId: string) =>
  storageKey(`ll:recent-worlds:${accountId}:${characterId}`);

type WorldSelectorProps = {
  disabled?: boolean;
  className?: string;
};

const MAX_RECENT_WORLDS = 3;

export const WorldSelector: FC<WorldSelectorProps> = ({
  disabled = false,
  className = "",
}) => {
  const { t } = useTranslation("common");
  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const defaultWorld = Game.getWorldName();

  const { guildIdByCharId, worldByGuildId, setWorld } = useSettingsStore();
  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const { data: worlds, isFetched } = useGuildsControllerGetWorldsByGuildId(
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
    [],
  );

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

  const worldGroups = useMemo<ComboboxGroup[]>(() => {
    if (!worlds || worlds.length === 0) return [];

    const recent =
      recentWorlds
        ?.filter((w) => worlds.includes(w))
        .map((w) => ({
          value: w,
          label: w.charAt(0).toUpperCase() + w.slice(1),
        })) ?? [];

    const recentValues = new Set(recent.map((w) => w.value));
    const rest = worlds
      .filter((w) => !recentValues.has(w))
      .map((w) => ({
        value: w,
        label: w.charAt(0).toUpperCase() + w.slice(1),
      }));

    const groups: ComboboxGroup[] = [];

    if (recent.length > 0) {
      groups.push({ label: t("worldSelector.recent"), options: recent });
    }

    if (rest.length > 0) {
      groups.push({ label: t("worldSelector.allWorlds"), options: rest });
    }

    return groups;
  }, [recentWorlds, t, worlds]);

  const handleWorldChange = (newWorld: string) => {
    if (!guildId) return;

    if (newWorld) {
      const updatedRecent = [
        newWorld,
        ...(recentWorlds?.filter((w) => w !== newWorld) ?? []),
      ].slice(0, MAX_RECENT_WORLDS);
      setRecentWorlds(updatedRecent);
    }

    setWorld(guildId, newWorld);
  };

  return (
    <Combobox
      value={world}
      onValueChange={handleWorldChange}
      groups={worldGroups}
      placeholder={t("worldSelector.placeholder")}
      searchPlaceholder={t("worldSelector.searchPlaceholder")}
      emptyText={t("worldSelector.empty")}
      disabled={disabled}
      triggerClassName={cn(
        "ll:text-white ll:text-xs ll:border-gray-400 ll:rounded-xs ll:h-6 ll:mb-1 ll-custom-cursor-pointer ll:w-full",
        className,
      )}
      contentClassName="ll:font-sans ll:z-500"
    />
  );
};
